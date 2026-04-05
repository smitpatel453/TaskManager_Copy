# Advanced LiveKit Video Calling Features - Implementation Guide

## Overview

You now have a **fully-featured video calling system** with the following advanced capabilities:

✅ **Socket.io Real-time Updates**  
✅ **Call History & Analytics**  
✅ **Recording Support**  
✅ **Screen Sharing**  
✅ **Custom Themes (Dark/Light)**  
✅ **Call Statistics**  

---

## Features Implemented

### 1. **Socket.io Real-Time Call Status Updates**

The system emits real-time events for all call activities:

```javascript
// Backend emits these Socket.io events:
'channel:call-started'      // When a call begins
'channel:call-user-joined'  // When a user joins
'channel:call-user-left'    // When a user leaves
'channel:call-ended'        // When call ends
'channel:recording-enabled' // When recording starts
```

**Event Payload Example:**
```json
{
  "callId": "63f7a1b2c3d4e5f6g7h8i9j0",
  "channelId": "general",
  "roomName": "channel-general",
  "initiator": {
    "id": "user123",
    "name": "John Doe"
  },
  "startedAt": "2024-03-27T10:30:00Z",
  "recordingEnabled": true
}
```

**Use Case:** Update UI indicators, notifications, and real-time participant lists

---

### 2. **Call History Storage**

All calls are automatically logged to MongoDB with comprehensive details:

**Stored Data:**
- Channel ID & Room Name
- Initiator & Participants
- Start/End times & Duration
- Recording status & URL
- Creation timestamp

**Database Model:**
```
/backend/src/models/callHistory.model.ts
```

**API Endpoints:**

```bash
# Get call history for a channel
GET /api/videocalls/:channelId/history?limit=10&skip=0

# Response:
{
  "calls": [
    {
      "_id": "...",
      "channelId": "general",
      "duration": 1205,
      "participantIds": [...],
      "recordingEnabled": true,
      "startedAt": "2024-03-27T10:30:00Z",
      "endedAt": "2024-03-27T10:50:05Z"
    }
  ],
  "total": 42,
  "limit": 10,
  "skip": 0
}
```

**Frontend Component:**
```tsx
import { CallHistoryView } from '@/app/components/videocalls/CallHistoryView';

<CallHistoryView channelId="general" theme="dark" />
```

---

### 3. **Recording Setup**

Enable recording for any call to capture video/audio:

**Start Recording:**
```typescript
// Checkbox option when starting call
const recordingEnabled = true;
const callData = await videocallsApi.startCall(channelId, recordingEnabled);
```

**Enable During Call:**
```typescript
await videocallsApi.enableRecording(channelId, callId);
```

**Features:**
- Optional at call start or during call
- Real-time indicator showing recording status
- Automatic storage of recording metadata
- Recording URL stored in call history

**Frontend UI:**
```tsx
<ChannelCallPrompt
  channelId={channelId}
  onStartCall={handleStart}
  // Recording checkbox automatically added
/>
```

**Backend Endpoints:**
```bash
POST /api/videocalls/:channelId/start-call
Body: { recordingEnabled: true }

POST /api/videocalls/:channelId/enable-recording
Body: { callId: "..." }
```

---

### 4. **Screen Sharing**

Screen share button integrated in the video call UI:

**Frontend Component:**
```tsx
<ChannelVideoCall
  channelId={channelId}
  channelName="General"
  theme="dark" // Light theme also supported
/>
```

**UI Controls:**
- 📹 **Record Button** - Enable recording
- 🖥️ **Share Screen** - Toggle screen sharing
- 📞 **Leave** - End call

**Screen Share Button:**
```tsx
<button
  onClick={() => setScreenShareActive(!screenShareActive)}
  className={`p-2 rounded-lg transition-colors ${
    screenShareActive ? 'bg-blue-500/30' : 'hover:bg-white/20'
  }`}
  title="Share screen"
>
  {/* Screen share icon */}
</button>
```

---

### 5. **Custom Themes (Dark/Light)**

All components support switchable themes for brand consistency:

**Dark Theme (Default):**
```tsx
<ChannelVideoCall theme="dark" />
<ChannelCallPrompt theme="dark" />
<CallHistoryView theme="dark" />
```

**Light Theme:**
```tsx
<ChannelVideoCall theme="light" />
<ChannelCallPrompt theme="light" />
<CallHistoryView theme="light" />
```

**Theme Variables Used:**
- `var(--bg-surface-1)` / `var(--bg-surface-2)`
- `var(--text-primary)` / `var(--text-secondary)`
- `var(--accent)`
- `var(--border-subtle)`

**Dynamic Theme Toggle:**
```tsx
const [isDarkMode, setIsDarkMode] = useState(true);

return (
  <>
    <button onClick={() => setIsDarkMode(!isDarkMode)}>
      Toggle Theme
    </button>
    <ChannelVideoCall theme={isDarkMode ? 'dark' : 'light'} />
  </>
);
```

---

### 6. **Call Statistics & Analytics**

Track user video calling metrics:

**API Endpoint:**
```bash
GET /api/videocalls/stats/user-stats

Response:
{
  "initiatedCalls": 15,
  "participatedCalls": 42,
  "totalDuration": 18240,      // seconds
  "averageDuration": 1215,     // seconds
  "totalCalls": 57
}
```

**Frontend Component:**
```tsx
import { UserCallStatsView } from '@/app/components/videocalls/CallHistoryView';

<UserCallStatsView theme="dark" />
```

**Display Format:**
- 📞 Calls Initiated: 15
- 👥 Calls Participated: 42
- ⏱️ Total Duration: 5h 4m
- 📊 Average Duration: 20m

---

## Complete Usage Example

### Integrating into Your Channel Page

```tsx
'use client';

import { useState } from 'react';
import { ChannelCallPrompt } from '@/app/components/videocalls/ChannelCallPrompt';
import { ChannelVideoCall } from '@/app/components/videocalls/ChannelVideoCall';
import { CallHistoryView, UserCallStatsView } from '@/app/components/videocalls/CallHistoryView';

export function ChannelPage({ channelId, channelName }) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [callData, setCallData] = useState(null);
  const [isDarkTheme, setIsDarkTheme] = useState(true);

  const handleStartCall = (token, url, roomName) => {
    setCallData({ token, url, roomName });
    setIsCallActive(true);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Theme Toggle */}
      <button
        onClick={() => setIsDarkTheme(!isDarkTheme)}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg"
      >
        {isDarkTheme ? '🌙 Dark' : '☀️ Light'} Mode
      </button>

      {/* Video Call Component */}
      {isCallActive && callData ? (
        <div>
          <ChannelVideoCall
            channelId={channelId}
            channelName={channelName}
            theme={isDarkTheme ? 'dark' : 'light'}
            onCallEnd={() => {
              setIsCallActive(false);
              setCallData(null);
            }}
          />
        </div>
      ) : (
        <ChannelCallPrompt
          channelId={channelId}
          channelName={channelName}
          theme={isDarkTheme ? 'dark' : 'light'}
          onStartCall={handleStartCall}
          onJoinCall={handleStartCall}
        />
      )}

      {/* Call Statistics */}
      <UserCallStatsView theme={isDarkTheme ? 'dark' : 'light'} />

      {/* Call History */}
      <CallHistoryView channelId={channelId} theme={isDarkTheme ? 'dark' : 'light'} />

      {/* Channel Messages Below */}
    </div>
  );
}
```

---

## API Quick Reference

### Video Call Management
```bash
# Start call (with optional recording)
POST /api/videocalls/:channelId/start-call
Body: { recordingEnabled: boolean }
Response: { token, url, roomName, callId, recordingEnabled }

# Join existing call
POST /api/videocalls/:channelId/join-call
Response: { token, url, roomName, callId }

# Leave call
POST /api/videocalls/:channelId/leave-call
Response: { success, message }

# End call (saves to history)
POST /api/videocalls/:channelId/end-call
Body: { callId: string }
Response: { success, message, duration }

# Get active call info
GET /api/videocalls/:channelId/call-info
Response: { hasActiveCall, activeCall }
```

### Call History & Analytics
```bash
# Get call history
GET /api/videocalls/:channelId/history?limit=10&skip=0
Response: { calls[], total, limit, skip }

# Enable recording
POST /api/videocalls/:channelId/enable-recording
Body: { callId: string }
Response: { success, message }

# Get user stats
GET /api/videocalls/stats/user-stats
Response: { initiatedCalls, participatedCalls, totalDuration, averageDuration, totalCalls }
```

---

## Database Schema

### Call History Collection
```javascript
db.call_history.find().pretty()
{
  "_id": ObjectId(),
  "channelId": "general",
  "roomName": "channel-general",
  "initiatorId": ObjectId("user123"),
  "participantIds": [ObjectId("user456"), ObjectId("user789")],
  "startedAt": ISODate("2024-03-27T10:30:00.000Z"),
  "endedAt": ISODate("2024-03-27T10:50:05.000Z"),
  "duration": 1205,                    // seconds
  "recordingEnabled": true,
  "recordingUrl": "https://...",
  "messagesSent": 0,
  "createdAt": ISODate("2024-03-27T10:30:00.000Z"),
  "updatedAt": ISODate("2024-03-27T10:50:05.000Z")
}
```

### Indexes Created:
- `{ channelId: 1, startedAt: -1 }` - Fast channel history queries
- `{ initiatorId: 1 }` - User initiated calls
- `{ participantIds: 1 }` - User participated calls
- `{ createdAt: -1 }` - Recent calls

---

## Frontend Components Structure

```
frontend/app/components/videocalls/
├── ChannelVideoCall.tsx        # Main video conference UI
├── ChannelCallPrompt.tsx        # Start/Join call UI
└── CallHistoryView.tsx          # History & statistics display
```

**Exports:**
```typescript
// ChannelVideoCall.tsx
export function ChannelVideoCall(props)
export function SimpleVideoCallUI(props)  // Fallback UI

// ChannelCallPrompt.tsx
export function ChannelCallPrompt(props)

// CallHistoryView.tsx
export function CallHistoryView(props)
export function UserCallStatsView(props)
```

---

## Backend Files Structure

```
backend/src/
├── models/
│   └── callHistory.model.ts      # NEW: Call history schema
├── controllers/
│   └── videocalls.controller.ts  # UPDATED: +4 new functions
├── routes/
│   └── videocalls.routes.ts      # UPDATED: +3 new routes
└── services/
    └── livekit.service.ts        # Token generation unchanged
```

---

## Socket.io Integration

### Listen for Call Events (Frontend)

```typescript
import { useEffect } from 'react';
import { io } from 'socket.io-client';

export function useCallNotifications(channelId: string) {
  useEffect(() => {
    const socket = io();

    // Listen for call started
    socket.on('channel:call-started', (data) => {
      console.log(`Call started by ${data.initiator.name}`);
      // Show notification
    });

    // Listen for user joined
    socket.on('channel:call-user-joined', (data) => {
      console.log(`${data.user.name} joined the call`);
    });

    // Listen for call ended
    socket.on('channel:call-ended', (data) => {
      console.log(`Call ended. Duration: ${data.duration}s`);
    });

    return () => socket.disconnect();
  }, [channelId]);
}
```

---

## Performance Considerations

### Scaling
- **MongoDB Indexes** properly set for fast queries
- **Call polling** set to 5-second intervals
- **Socket.io broadcast** only to channel members
- **Duration tracking** using efficient setInterval

### Optimization Tips
1. Use pagination for call history (limit 10-50)
2. Cache call stats with 1-minute TTL
3. Archive old calls after 30 days
4. Use CDN for recording URLs

---

## Troubleshooting

### Recording Not Starting
- Ensure `recordingEnabled: true` is passed
- Check LiveKit server has storage configured
- Verify `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET`

### Screen Share Not Working
- Ensure HTTPS on production (required for screen share)
- User must grant screen share permission
- Check browser supports WebRTC

### Theme Not Applying
- Verify CSS variables are defined in your app
- Check `--bg-surface-1`, `--text-primary` etc. are set
- Use `theme="light"` or `theme="dark"` prop

### Call History Empty
- Ensure new calls save with `callHistoryModel.create()`
- Check MongoDB connection and permissions
- Verify indexes are created

---

## Next Steps

1. **Deploy to Production**
   - Set `LIVEKIT_URL` to your Oracle instance
   - Configure recording storage (S3, Cloud Storage)
   - Set SSL certificate (required for screen share)

2. **Add Advanced Features**
   - Call transcription (Deepgram API)
   - AI-powered summaries
   - Call playback dashboard
   - Analytics & reporting

3. **Monitor & Optimize**
   - Track call quality metrics
   - Monitor LiveKit server health
   - Set up alerts for failures
   - Regular database maintenance

---

## Files Changed

✅ **Backend:**
- `src/models/callHistory.model.ts` (NEW)
- `src/controllers/videocalls.controller.ts` (UPDATED - +4 functions)
- `src/routes/videocalls.routes.ts` (UPDATED - +3 routes)
- `src/config/env.ts` (Already had LiveKit vars)

✅ **Frontend:**
- `src/api/videocalls.api.ts` (UPDATED - +4 new methods)
- `app/components/videocalls/ChannelVideoCall.tsx` (UPDATED - Recording, Screen Share, Themes)
- `app/components/videocalls/ChannelCallPrompt.tsx` (UPDATED - Recording toggle, Themes)
- `app/components/videocalls/CallHistoryView.tsx` (NEW)

---

## Support & Documentation

- LiveKit Docs: https://docs.livekit.io/
- Socket.io Docs: https://socket.io/docs/
- MongoDB Aggregation: https://docs.mongodb.com/manual/aggregation/

For questions, check backend logs:
```bash
docker logs livekit      # LiveKit server logs
npm run dev              # Backend dev logs
npm run dev              # Frontend dev logs (frontend folder)
```
