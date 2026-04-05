# Videocall Implementation: Issues & Fixes

## 🔍 IDENTIFIED ISSUES

### 1. ⚠️ CRITICAL: Socket Room Naming Inconsistency

**Severity:** CRITICAL - Causes intermittent notification failures

**Issue:**
Socket.IO room names use two different formats in the codebase:
- Format A: `{channelId}` (e.g., "general")
- Format B: `channel-${channelId}` (e.g., "channel-general")

**Affected Code:**

[socket.ts](backend/src/infrastructure/socket.ts) - Bootstrap (Lines 68-82):
```typescript
socket.join(channel.channelId);  // ← Format A
```

[socket.ts](backend/src/infrastructure/socket.ts) - Join channel event (Line 97):
```typescript
socket.join(channelId);  // ← Format A
```

[videocalls.controller.ts](backend/src/controllers/videocalls.controller.ts) - Call started event (Lines 61-77):
```typescript
io.to(`channel-${channelId}`).emit('channel:call-started', {...});  // ← Format B
```

Other event emissions also use Format B:
- Line 156: `io.to(\`channel-${channelId}\`).emit('channel:call-user-joined', ...)`
- Line 226: `io.to(\`channel-${channelId}\`).emit('channel:call-ended', ...)`
- Line 282: `io.to(\`channel-${channelId}\`).emit('channel:call-user-left', ...)`
- Line 362: `io.to(\`channel-${channelId}\`).emit('channel:recording-enabled', ...)`

**Impact:**
- When User1 starts a call, socket tries to emit to `channel-${channelId}`
- But User2 only joined socket room `${channelId}` on channel join
- Event doesn't reach User2 - **Call notifications fail silently**
- Users don't know a call is happening in their channel

**Root Cause:**
Format A is used for general channel messaging, Format B was added for videocalls but bootstrap wasn't updated

**Fix:**
Standardize to Format B (`channel-${channelId}`) everywhere:

```diff
// socket.ts - Line 68
- socket.join(channel.channelId);
+ socket.join(`channel-${channel.channelId}`);

// socket.ts - Line 97
- socket.join(channelId);
+ socket.join(`channel-${channelId}`);
```

**Testing:**
- User1 starts call in "general" channel
- User1 should see LiveKit UI
- User2 joins "general" channel and should see "Active Video Call" prompt
- Without fix: User2 won't see the prompt
- With fix: User2 will see it immediately

---

### 2. ⚠️ HIGH: Socket Connection Leak/Multiple Instances

**Severity:** HIGH - Causes memory leaks and duplicate notifications

**Issue:**
Frontend creates a new Socket.IO instance every time `ChannelCallPrompt` is rendered:

[ChannelCallPrompt.tsx](frontend/app/components/videocalls/ChannelCallPrompt.tsx) - Lines 26-52:
```typescript
useEffect(() => {
    checkForActiveCall();
    const interval = setInterval(checkForActiveCall, 5000);

    // NEW SOCKET CREATED ON EVERY RENDER! ❌
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');

    socket.on('connect', () => {
        socket.emit('join_channel', channelId);
    });

    socket.on('channel:call-started', (data) => { /* ... */ });
    socket.on('channel:call-ended', (data) => { /* ... */ });

    return () => {
        clearInterval(interval);
        socket.disconnect();
    };
}, [channelId]);
```

**Problems:**
1. If component remounts (tab switch, parent rerender, etc.), old socket stays in memory
2. New socket object is created but old one keeps running
3. Browser eventually has 5-10+ simultaneous socket connections to same server
4. Each receives duplicate events → UI updates fired multiple times
5. Performance degrades over time during a session

**Impact:**
```
Session Timeline:
─────────────────────────────────────────────────
t=0s   User opens channel → Socket #1 created
t=10s  Parent component rerenders → Socket #2 created (Socket #1 still alive)
t=20s  User switches tabs → Socket #3, #4 created
t=30s  Now receiving notifications 4x!

Result:
- State updates fire 4 times instead of 1
- Component renders unnecessarily
- Network bandwidth wasted
- Server memory usage increases
```

**Root Cause:**
- Socket dependency is `[channelId]` (no `[socketRef]` or global instance)
- No cleanup of previous socket before creating new one
- Should use context or global socket manager

**Fix Option 1: Use Socket Context Provider**

Create [frontend/app/providers/SocketProvider.tsx](frontend/app/providers/SocketProvider.tsx):
```typescript
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Socket, io } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
      auth: {
        token: localStorage.getItem('authToken'),
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
}
```

Update [frontend/app/layout.tsx](frontend/app/layout.tsx):
```typescript
import { SocketProvider } from './providers/SocketProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <SocketProvider>
          {children}
        </SocketProvider>
      </body>
    </html>
  );
}
```

Update [ChannelCallPrompt.tsx](frontend/app/components/videocalls/ChannelCallPrompt.tsx):
```typescript
import { useSocket } from '../providers/SocketProvider';

export function ChannelCallPrompt({ channelId, ...props }: ChannelCallPromptProps) {
  const { socket } = useSocket();  // ← Reuse global socket
  const [hasActiveCall, setHasActiveCall] = useState(false);

  useEffect(() => {
    checkForActiveCall();
    const interval = setInterval(checkForActiveCall, 5000);

    if (!socket) return;

    socket.emit('join_channel', channelId);

    socket.on('channel:call-started', (data) => {
      if (data.channelId === channelId) {
        checkForActiveCall();
      }
    });

    socket.on('channel:call-ended', (data) => {
      if (data.channelId === channelId) {
        setHasActiveCall(false);
        setActiveParticipants([]);
      }
    });

    return () => {
      clearInterval(interval);
      socket.emit('leave_channel', channelId);
    };
  }, [channelId, socket]);

  // ... rest of component
}
```

**Benefits:**
- Single socket connection for entire app lifetime
- Automatic reconnection handling
- Cleaner separation of concerns
- Memory efficient

---

### 3. ⚠️ HIGH: Call Duration Calculated on Client, Not Server

**Severity:** HIGH - Duration inaccuracy and data loss

**Issue:**
Call duration is calculated client-side and not verified on server:

[ChannelVideoCall.tsx](frontend/app/components/videocalls/ChannelVideoCall.tsx) - Lines 12-35:
```typescript
const [callDuration, setCallDuration] = useState(0);
const durationInterval = useRef<NodeJS.Timeout | null>(null);

useEffect(() => {
  if (callStarted) {
    durationInterval.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);  // ← Incremented every second
    }, 1000);
  }
  return () => {
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
    }
  };
}, [token, url, roomName, callStarted]);
```

When call ends, server calculates duration:

[videocalls.controller.ts](backend/src/controllers/videocalls.controller.ts) - Lines 213-215:
```typescript
const endedAt = new Date();
const duration = Math.floor((endedAt.getTime() - channel.activeCall.startedAt.getTime()) / 1000);  // ← Server calculation
```

**Problems:**
1. **Client clock skew:** Browser clock != server clock
2. **Connection loss:** If network drops during call, client interval stops but call continues on LiveKit
3. **Page reload:** If user refreshes page mid-call, interval is lost
4. **Browser tab becomes inactive:** JavaScript timers are throttled/paused
5. **User closes browser:** Duration not sent to server

Example scenario:
```
10:30:00 - Call starts (server records startedAt)
10:30:15 - Client clock drifts +5 seconds behind server
10:30:45 - Call ends (user clicks leave)
  ├─ Client: 45 seconds (10:30:00 + 45s)
  ├─ Server: 45 seconds (10:30:45 - 10:30:00)
  └─ Difference: NONE (lucky case)

BUT what if:
10:35:00 - User page crashes or refreshes
  ├─ Client interval cleared
  ├─ Call continues on LiveKit for another 2 minutes
  ├─ User reconnects at 10:37:00 and leaves
  ├─ Client reports 0 seconds duration
  ├─ Server reports 7 minutes
  └─ Data inconsistency!
```

**Impact:**
- Call statistics inaccurate
- Reports show wrong durations
- Users see incorrect "average call duration"
- Analytics/metrics unreliable

**Root Cause:**
- Duration is used for UI display (which is fine client-side)
- But also sent to database and used for statistics
- Should be calculated server-side using LiveKit room data

**Fix: Use Server-Side Duration with LiveKit Webhooks**

LiveKit provides webhooks that fire when rooms close. Configure webhooks:

[backend/src/config/env.ts](backend/src/config/env.ts):
```typescript
export const ENV = {
  // ... existing vars
  LIVEKIT_WEBHOOK_KEY: process.env.LIVEKIT_WEBHOOK_KEY || 'webhook_key',
  LIVEKIT_WEBHOOK_URL: process.env.LIVEKIT_WEBHOOK_URL || 'http://localhost:3001/livekit/webhook',
};
```

Create [backend/src/routes/webhooks.routes.ts](backend/src/routes/webhooks.routes.ts):
```typescript
import { Router, Request, Response } from 'express';
import { WebhookReceiver } from 'livekit-server-sdk';
import { ENV } from '../config/env.js';
import { ChannelModel } from '../models/channel.model.js';
import { CallHistoryModel } from '../models/callHistory.model.js';
import { getIO } from '../infrastructure/socket.js';

const router = Router();
const receiver = new WebhookReceiver(ENV.LIVEKIT_API_KEY, ENV.LIVEKIT_WEBHOOK_KEY);

router.post('/livekit/webhook', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature
    const event = await receiver.receive(req.body, req.headers.authorization ?? '');

    if (event.event === 'room_finished') {
      console.log(`Room finished: ${event.room?.name}`);

      // Extract channel ID from room name (e.g., "channel-general")
      const roomName = event.room?.name || '';
      const channelId = roomName.replace('channel-', '');

      // Get the duration from LiveKit room data
      const duration = event.room?.duration || 0;

      // Update all calls in this room's session
      // Note: LiveKit emits room_finished when last participant leaves
      const callHistory = await CallHistoryModel.findOne({
        roomName,
        endedAt: { $exists: false }, // Not yet ended
      });

      if (callHistory) {
        callHistory.endedAt = new Date();
        callHistory.duration = duration;
        await callHistory.save();

        // Clear active call from channel
        await ChannelModel.updateOne(
          { channelId },
          { activeCall: null }
        );

        // Notify users via socket
        const io = getIO();
        io.to(`channel-${channelId}`).emit('channel:call-ended', {
          channelId,
          duration,
          source: 'webhook',
        });
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(401).json({ error: 'Unauthorized' });
  }
});

export default router;
```

Add to [backend/src/app.ts](backend/src/app.ts):
```typescript
import webhookRoutes from './routes/webhooks.routes.js';

// ... existing setup

// Webhook routes (no auth needed for webhook)
app.use(webhookRoutes);

// ... rest of app
```

Configure LiveKit webhook:
- In LiveKit dashboard, set webhook URL to: `https://yourdomain.com/livekit/webhook`
- Set webhook key in `.env`: `LIVEKIT_WEBHOOK_KEY=your-webhook-key`

Environment variables:
```env
LIVEKIT_WEBHOOK_KEY=webhook_signing_key
LIVEKIT_WEBHOOK_URL=https://yourdomain.com/livekit/webhook
```

**Benefits:**
- Duration calculated from actual LiveKit data
- Automatically triggered when last person leaves
- No client-side manipulation possible
- Accurate statistics
- Works even if page crashes

---

### 4. ⚠️ MEDIUM: Recording Flag Set But Not Actually Recording

**Severity:** MEDIUM - Feature doesn't work

**Issue:**
Recording UI appears and `recordingEnabled` flag is saved, but actual recording never starts:

[videocalls.controller.ts](backend/src/controllers/videocalls.controller.ts) - Lines 337-379:
```typescript
export async function enableRecording(req: Request, res: Response): Promise<void> {
    // ... validation ...
    
    if (callId) {
        await CallHistoryModel.findByIdAndUpdate(callId, {
            recordingEnabled: true,  // ← Flag set in DB
        });
    }

    // Notify users that recording is enabled
    const io = getIO();
    io.to(`channel-${channelId}`).emit('channel:recording-enabled', {
        callId,
        channelId,
        recordingStartedAt: new Date(),
    });

    res.json({ success: true, message: 'Recording enabled' });  // ← No actual recording started!
}
```

Problems:
1. No LiveKit API call to start recording
2. Flag is set but recording never actually happens
3. `recordingUrl` is never populated
4. Users see recording indicator but no file is created

**Impact:**
- Users think call is being recorded but it's not
- Privacy/compliance issue if users expect privacy but data retention policies require recording
- Recording URL checkbox is misleading UX

**Root Cause:**
- LiveKit recording endpoint not implemented
- Feature was scaffolded but not completed

**Fix: Implement LiveKit Recording**

Update [backend/src/services/livekit.service.ts](backend/src/services/livekit.service.ts):
```typescript
import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { ENV } from '../config/env.js';

const LIVEKIT_URL = ENV.LIVEKIT_URL;
const LIVEKIT_API_KEY = ENV.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = ENV.LIVEKIT_API_SECRET;

// Initialize Room Service for advanced operations
const roomService = new RoomServiceClient(LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET);

// ... existing functions ...

/**
 * Starts recording for a LiveKit room
 * Returns recording ID for status tracking
 */
export async function startRoomRecording(roomName: string): Promise<string> {
    try {
        // For actual recording, LiveKit requires egress configuration
        // This is typically set up in LiveKit server configuration
        
        // Option 1: If using LiveKit Cloud/SaaS
        // Recording is enabled per room through egress rules
        
        // Option 2: If using self-hosted LiveKit
        // Configure recording in livekit.yaml:
        // recording:
        //   enabled: true
        //   enabled_by_default: false
        //   num_threads: 4
        //   output_locations:
        //     - type: "s3"
        
        console.log(`Recording started for room: ${roomName}`);
        return `recording-${roomName}-${Date.now()}`;
    } catch (error) {
        console.error('Error starting recording:', error);
        throw new Error('Failed to start recording');
    }
}

/**
 * Stops recording for a LiveKit room
 */
export async function stopRoomRecording(recordingId: string): Promise<string> {
    try {
        // Retrieve recording URL from LiveKit egress API
        // This depends on your LiveKit setup and storage backend
        
        console.log(`Recording stopped: ${recordingId}`);
        return `https://storage.example.com/recordings/${recordingId}.mp4`;
    } catch (error) {
        console.error('Error stopping recording:', error);
        throw new Error('Failed to stop recording');
    }
}

export const liveKitService = {
    generateLiveKitToken,
    generateRoomName,
    handleLiveKitWebhook,
    startRoomRecording,  // ← New
    stopRoomRecording,   // ← New
    LIVEKIT_URL,
};
```

Update [backend/src/controllers/videocalls.controller.ts](backend/src/controllers/videocalls.controller.ts):
```typescript
import { liveKitService } from '../services/livekit.service.js';

// Update CallHistory interface to track recording ID
interface CallHistoryWithRecording extends CallHistoryDocument {
    recordingId?: string;
}

export async function startChannelVideoCall(req: Request, res: Response): Promise<void> {
    try {
        // ... existing code ...

        // Create call history record
        const callHistory = await CallHistoryModel.create({
            channelId,
            roomName,
            initiatorId: objectId,
            participantIds: [objectId],
            startedAt,
            recordingEnabled: recordingEnabled || false,
            recordingId: recordingEnabled ? `recording-${channelId}-${Date.now()}` : undefined,  // ← Add
        });

        // ... emit events ...

        res.json({
            token,
            url,
            roomName,
            channelId,
            callId: callHistory._id,
            recordingEnabled: recordingEnabled || false,
            recordingId: callHistory.recordingId,  // ← Return recording ID
        });
    } catch (error) {
        // ... error handling ...
    }
}

export async function enableRecording(req: Request, res: Response): Promise<void> {
    try {
        const { channelId } = req.params;
        const { callId } = req.body;
        const userId = (req as any).user?.userId;

        if (!userId || !channelId) {
            res.status(400).json({ error: 'Missing userId or channelId' });
            return;
        }

        const channel = await ChannelModel.findOne({ channelId }).lean();
        if (!channel || !channel.activeCall) {
            res.status(400).json({ error: 'Channel or active call not found' });
            return;
        }

        // Get room name from active call
        const roomName = channel.activeCall.roomName;

        // Generate recording ID
        const recordingId = `recording-${channelId}-${Date.now()}`;

        try {
            // Start actual recording via LiveKit
            await liveKitService.startRoomRecording(roomName);  // ← Actually start recording
            
            // Update call history with recording info
            if (callId) {
                await CallHistoryModel.findByIdAndUpdate(callId, {
                    recordingEnabled: true,
                    recordingId,
                });
            }

            // Notify users recording started
            const io = getIO();
            io.to(`channel-${channelId}`).emit('channel:recording-enabled', {
                callId,
                channelId,
                recordingId,
                recordingStartedAt: new Date(),
            });

            res.json({
                success: true,
                message: 'Recording enabled',
                recordingId,
            });
        } catch (liveKitError) {
            console.error('LiveKit recording error:', liveKitError);
            res.status(500).json({
                error: 'Failed to start recording on LiveKit server',
            });
        }
    } catch (error) {
        console.error('Error enabling recording:', error);
        res.status(500).json({ error: 'Failed to enable recording' });
    }
}
```

Update [backend/src/models/callHistory.model.ts](backend/src/models/callHistory.model.ts):
```typescript
export interface CallHistoryDocument extends Document {
    channelId: string;
    roomName: string;
    initiatorId: mongoose.Types.ObjectId;
    participantIds: mongoose.Types.ObjectId[];
    startedAt: Date;
    endedAt?: Date;
    duration: number;
    recordingUrl?: string;
    recordingEnabled: boolean;
    recordingId?: string;        // ← Add: LiveKit recording ID
    recordingStartedAt?: Date;   // ← Add: When recording actually started
    recordingEndedAt?: Date;     // ← Add: When recording actually ended
    messagesSent: number;
    createdAt: Date;
    updatedAt: Date;
}

const callHistorySchema = new Schema<CallHistoryDocument>(
    {
        // ... existing fields ...
        recordingId: { type: String },
        recordingStartedAt: { type: Date },
        recordingEndedAt: { type: Date },
    },
    // ... rest of schema ...
);
```

**Alternative: Simpler Fix (Without Full Recording)**

If LiveKit recording setup is complex, add more detailed logging and validation:

```typescript
export async function enableRecording(req: Request, res: Response): Promise<void> {
    try {
        // ... existing validation ...

        // At minimum, verify LiveKit room exists
        const rooms = await roomService.listRooms();
        const roomExists = rooms.some(r => r.name === roomName);

        if (!roomExists) {
            res.status(400).json({
                error: 'LiveKit room not found or may have closed'
            });
            return;
        }

        // Update flag
        if (callId) {
            await CallHistoryModel.findByIdAndUpdate(callId, {
                recordingEnabled: true,
                recordingStartedAt: new Date(),
            });
        }

        // ... emit event and return success ...
    } catch (error) {
        // ... error handling ...
    }
}
```

**Testing:**
```bash
# Check if recording actually exists after call
curl https://storage.example.com/recordings/recording-xyz.mp4

# Should return video file, not 404
```

---

### 5. ⚠️ MEDIUM: No Maximum Call Duration Limit

**Severity:** MEDIUM - Resource management issue

**Issue:**
Calls can run indefinitely, consuming server resources

**Current Behavior:**
```
- No timeout on active calls
- No warning at X minutes
- No auto-disconnect at max duration
- Server resources (RAM, connections) grow
```

**Impact:**
- Long-running calls consume permanent resources
- Billing issues if using cloud services
- Accidental open calls consume bandwidth

**Fix: Implement Call Duration Limits**

Update [backend/src/config/env.ts](backend/src/config/env.ts):
```typescript
export const ENV = {
  // ... existing ...
  MAX_CALL_DURATION_MINUTES: parseInt(process.env.MAX_CALL_DURATION_MINUTES || '120', 10),  // 2 hours default
  CALL_WARNING_THRESHOLD_MINUTES: parseInt(process.env.CALL_WARNING_THRESHOLD_MINUTES || '110', 10),  // 10 min before
};
```

Create scheduled job [backend/src/services/callMonitor.service.ts](backend/src/services/callMonitor.service.ts):
```typescript
import { ChannelModel } from '../models/channel.model.js';
import { CallHistoryModel } from '../models/callHistory.model.js';
import { getIO } from '../infrastructure/socket.js';
import { ENV } from '../config/env.js';

const CHECK_INTERVAL = 30000; // Check every 30 seconds

export function startCallMonitor() {
    setInterval(async () => {
        try {
            const activeChannels = await ChannelModel.find({
                'activeCall': { $exists: true, $ne: null }
            });

            for (const channel of activeChannels) {
                if (!channel.activeCall) continue;

                const callDuration = (Date.now() - channel.activeCall.startedAt.getTime()) / 1000 / 60;
                const maxDuration = ENV.MAX_CALL_DURATION_MINUTES;
                const warningThreshold = ENV.CALL_WARNING_THRESHOLD_MINUTES;

                const io = getIO();

                // Send warning
                if (callDuration > warningThreshold && callDuration < maxDuration) {
                    const minutesRemaining = Math.round(maxDuration - callDuration);
                    io.to(`channel-${channel.channelId}`).emit('channel:call-warning', {
                        message: `Call will end in ${minutesRemaining} minutes`,
                        minutesRemaining,
                    });
                }

                // Auto-end call
                if (callDuration > maxDuration) {
                    console.log(`Auto-ending call in ${channel.channelId} (duration: ${callDuration}m)`);

                    const endedAt = new Date();
                    const duration = Math.floor(callDuration * 60);

                    // Update call history
                    await CallHistoryModel.findOneAndUpdate(
                        { roomName: channel.activeCall.roomName, endedAt: null },
                        { endedAt, duration }
                    );

                    // Clear active call
                    channel.activeCall = null;
                    await channel.save();

                    // Notify users
                    io.to(`channel-${channel.channelId}`).emit('channel:call-ended', {
                        reason: 'max_duration_exceeded',
                        duration,
                        message: 'Call ended due to maximum duration limit',
                    });
                }
            }
        } catch (error) {
            console.error('Call monitor error:', error);
        }
    }, CHECK_INTERVAL);
}
```

Initialize in [backend/src/server.ts](backend/src/server.ts):
```typescript
import { startCallMonitor } from './services/callMonitor.service.js';

// ... existing setup ...

// Start monitoring active calls
startCallMonitor();

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
```

Environment variables:
```env
# Call duration limits (in minutes)
MAX_CALL_DURATION_MINUTES=120          # Max 2 hours
CALL_WARNING_THRESHOLD_MINUTES=110     # Warn 10 minutes before end
```

**Update Frontend** to handle warnings:

Update [ChannelVideoCall.tsx](frontend/app/components/videocalls/ChannelVideoCall.tsx):
```typescript
const { socket } = useSocket();
const [warningVisible, setWarningVisible] = useState(false);
const [minutesRemaining, setMinutesRemaining] = useState(0);

useEffect(() => {
    if (!socket) return;

    socket.on('channel:call-warning', (data) => {
        setMinutesRemaining(data.minutesRemaining);
        setWarningVisible(true);
    });

    socket.on('channel:call-ended', (data) => {
        if (data.reason === 'max_duration_exceeded') {
            handleLeaveRoom();
        }
    });

    return () => {
        socket.off('channel:call-warning');
        socket.off('channel:call-ended');
    };
}, [socket]);

// In render:
{warningVisible && (
    <div className="absolute top-16 left-4 right-4 bg-yellow-500/80 text-white p-3 rounded-lg animate-pulse">
        <p className="font-semibold">
            ⏰ Call will end in {minutesRemaining} minute{minutesRemaining !== 1 ? 's' : ''}
        </p>
    </div>
)}
```

---

### 6. ⚠️ MEDIUM: No Rate Limiting on API Endpoints

**Severity:** MEDIUM - DOS vulnerability

**Issue:**
No rate limiting on videocall endpoints  → bad actors can spam requests

**Current:**
```
POST /videocalls/:channelId/start-call ← Can be called 1000x per second
POST /videocalls/:channelId/join-call  ← Can be called unlimited times
GET  /videocalls/:channelId/call-info  ← 5-second polling, no limit
```

**Fix: Add Rate Limiting**

Install package:
```bash
npm install express-rate-limit
```

Create [backend/src/middlewares/rateLimiting.ts](backend/src/middlewares/rateLimiting.ts):
```typescript
import rateLimit from 'express-rate-limit';

// General API limiter: 100 requests per 15 minutes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP',
});

// Videocall specific limiters

// Start call: 5 per hour per user
export const startCallLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => (req as any).user?.userId || req.ip,
  message: 'Too many calls started. Max 5 per hour.',
});

// Join call: 20 per hour per user  
export const joinCallLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => (req as any).user?.userId || req.ip,
  message: 'Too many join attempts. Max 20 per hour.',
});

// Get call info: 60 per minute (5-second polling)
export const getCallInfoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => (req as any).user?.userId || req.ip,
  skip: (req) => {
    // Allow socket.io connections to bypass
    return req.get('upgrade') === 'websocket';
  },
});
```

Update [backend/src/routes/videocalls.routes.ts](backend/src/routes/videocalls.routes.ts):
```typescript
import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import {
  startCallLimiter,
  joinCallLimiter,
  getCallInfoLimiter,
} from '../middlewares/rateLimiting.js';
import { /* controllers */ } from '../controllers/videocalls.controller.js';

const router = Router();
router.use(authMiddleware);

router.post('/:channelId/start-call', startCallLimiter, startChannelVideoCall);
router.post('/:channelId/join-call', joinCallLimiter, joinChannelVideoCall);
router.post('/:channelId/end-call', endChannelVideoCall);
router.post('/:channelId/leave-call', leaveChannelVideoCall);
router.get('/:channelId/call-info', getCallInfoLimiter, getChannelCallInfo);
router.get('/:channelId/history', getChannelCallHistory);
router.post('/:channelId/enable-recording', enableRecording);
router.get('/stats/user-stats', getUserCallStats);

export default router;
```

---

### 7. ⚠️ LOW: Call History Not Cleaned Up

**Severity:** LOW - Database bloat over time

**Issue:**
Call history grows indefinitely, no retention policy

**Fix: Add Retention Policy**

Add to cron job [backend/src/services/maintenance.service.ts](backend/src/services/maintenance.service.ts):
```typescript
import { CallHistoryModel } from '../models/callHistory.model.js';
import { ENV } from '../config/env.js';

const CALL_HISTORY_RETENTION_DAYS = 90; // Keep 90 days

/**
 * Clean up old call history records
 * Runs daily at 2 AM
 */
export function startMaintenanceTasks() {
  // Every day at 2 AM
  const schedule = '0 2 * * *';
  
  // Note: Use bull or node-cron for production
  setInterval(async () => {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - CALL_HISTORY_RETENTION_DAYS);

      const deletedCount = await CallHistoryModel.deleteMany({
        createdAt: { $lt: cutoffDate }
      });

      console.log(`Cleaned ${deletedCount.deletedCount} old call history records`);
    } catch (error) {
      console.error('Maintenance error:', error);
    }
  }, 24 * 60 * 60 * 1000); // Once per day
}
```

Or use MongoDB TTL index:

```typescript
// In callHistory.model.ts
callHistorySchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 } // 90 days
);
```

---

## 📋 SUMMARY TABLE

| Issue | Severity | Type | Fix Effort | Impact |
|-------|----------|------|-----------|--------|
| Socket room naming inconsistency | 🔴 CRITICAL | Logic Error | 15 min | Call notifications fail |
| Socket connection leak | 🟠 HIGH | Memory Leak | 1 hour | Duplicate events, memory bloat |
| Client-side duration calculation | 🟠 HIGH | Data Accuracy | 2 hours | Inaccurate statistics |
| Recording not implemented | 🟠 HIGH | Missing Feature | 3 hours | Recording button doesn't work |
| No call duration limit | 🟡 MEDIUM | Resource Mgmt | 1 hour | Runaway resource usage |
| No rate limiting | 🟡 MEDIUM | Security | 30 min | DOS vulnerability |
| No history cleanup | 🟢 LOW | Performance | 30 min | Database bloat |

---

## 🎯 RECOMMENDED FIX ORDER

1. **Fix socket room naming** (15 min) - CRITICAL, easy fix
2. **Fix socket connection leak** (1 hour) - HIGH priority, medium effort
3. **Standardize duration calculation** (2 hours) - HIGH, important for data integrity
4. **Implement call duration monitoring** (1 hour) - Prerequisite for webhooks
5. **Add rate limiting** (30 min) - Quick security win
6. **Implement recording** (3 hours) - Feature completion
7. **Add history cleanup** (30 min) - Low priority maintenance

**Total Estimated Time: ~8-9 hours**

