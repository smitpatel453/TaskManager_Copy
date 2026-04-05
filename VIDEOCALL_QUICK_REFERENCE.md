# Videocall Implementation: Quick Reference Guide

## 📊 File Structure Overview

```
FRONTEND (React/Next.js)
├── Components
│   └── app/components/videocalls/
│       ├── ChannelCallPrompt.tsx        [Start/Join UI]
│       ├── ChannelVideoCall.tsx         [LiveKit conference UI]
│       └── CallHistoryView.tsx          [History & stats]
│
├── API Client
│   └── src/api/videocalls.api.ts        [HTTP wrapper]
│
└── Providers
    └── providers/SocketProvider.tsx     [WebSocket context] - SHOULD BE ADDED

BACKEND (Express/Node.js)
├── Routes
│   └── src/routes/videocalls.routes.ts  [8 endpoints]
│
├── Controllers
│   └── src/controllers/videocalls.controller.ts  [Business logic]
│
├── Services
│   ├── src/services/livekit.service.ts         [Token generation]
│   ├── src/services/callMonitor.service.ts     [SHOULD BE ADDED]
│   └── src/services/maintenance.service.ts     [SHOULD BE ADDED]
│
├── Infrastructure
│   └── src/infrastructure/socket.ts    [WebSocket server]
│
├── Models
│   └── src/models/
│       ├── callHistory.model.ts        [Call records]
│       └── channel.model.ts            [activeCall field]
│
└── Config
    └── src/config/env.ts               [Environment variables]

DATABASE
├── Collections
│   ├── channels                        [activeCall: {roomName, startedAt, participants}]
│   ├── call_history                    [Complete call records]
│   └── users                           [Referenced in calls]
│
└── Indexes
    ├── call_history: {channelId: 1, startedAt: -1}
    ├── call_history: {initiatorId: 1}
    ├── call_history: {participantIds: 1}
    └── call_history: {createdAt: -1}

EXTERNAL
└── LiveKit Server
    ├── HTTP API (Token generation)
    ├── WebRTC (Media streaming)
    ├── Recording (Optional)
    └── Webhooks (Optional)
```

---

## 🔄 Request/Response Flow

### Start Call Flow
```
User1 clicks "Start Call"
    ↓
POST /videocalls/:channelId/start-call
    ├─ Validate user & channel
    ├─ Generate room name
    ├─ Generate LiveKit token
    ├─ Create ChannelModel.activeCall
    ├─ Create CallHistory record
    ├─ Emit socket 'channel:call-started'
    └─ Return {token, url, roomName, callId}
    ↓
User1 connects to LiveKit with token
    ↓
Other users see "Active Call" prompt via socket event
```

### Join Call Flow
```
User2 sees "Active Video Call" prompt (from socket event)
    ↓
User2 clicks "Join Call"
    ↓
POST /videocalls/:channelId/join-call
    ├─ Validate activeCall exists
    ├─ Generate token for same room
    ├─ Add User2 to activeCall.participants
    ├─ Emit socket 'channel:call-user-joined'
    └─ Return {token, url, roomName}
    ↓
User2 connects to same LiveKit room
    ↓
User1 and User2 can see each other
```

### End Call Flow
```
User1 clicks "End Call" or "Leave"
    ↓
POST /videocalls/:channelId/end-call
    ├─ Calculate duration
    ├─ Update CallHistory {endedAt, duration}
    ├─ Clear ChannelModel.activeCall
    ├─ Emit socket 'channel:call-ended'
    └─ Return {success, duration}
    ↓
All connected users see call ended
    ↓
Users return to "Start Call" UI
    ↓
Call recorded in call_history collection
```

---

## 🔌 Socket Events Reference

### Server → Client (Broadcast)

| Event | Payload | When Fired |
|-------|---------|-----------|
| `channel:call-started` | `{callId, channelId, roomName, initiator, startedAt, recordingEnabled}` | `startCall()` |
| `channel:call-ended` | `{callId, channelId, endedBy, endedAt, duration}` | `endCall()` |
| `channel:call-user-joined` | `{channelId, user: {id, name}}` | `joinCall()` |
| `channel:call-user-left` | `{channelId, userId}` | `leaveCall()` |
| `channel:recording-enabled` | `{callId, channelId, recordingStartedAt}` | `enableRecording()` |
| `channel:call-warning` | `{message, minutesRemaining}` | Call monitor (future) |

### Client → Server

| Event | Payload | Handler |
|-------|---------|---------|
| `join_channel` | `{channelId}` | Socket bootstraps user to channel room |
| `leave_channel` | `{channelId}` | Socket removes user from channel room |
| `send_message` | `{channelId, text, mentions, attachments}` | Saves to DB, broadcasts to channel |

---

## 🔐 Environment Variables

### Required
```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/taskmanager

# JWT
JWT_SECRET=your-secret-key-here

# LiveKit
LIVEKIT_URL=http://localhost:7880              # Dev
LIVEKIT_URL=https://livekit.example.com        # Prod
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

### Optional (Future)
```env
# Recording
LIVEKIT_WEBHOOK_KEY=webhook-signing-key
LIVEKIT_WEBHOOK_URL=https://yourdomain.com/livekit/webhook

# Limits
MAX_CALL_DURATION_MINUTES=120
CALL_WARNING_THRESHOLD_MINUTES=110

# Email notifications (if implemented)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## 🛠️ Common Operations

### Check if Call is Active
```typescript
const callInfo = await videocallsApi.getCallInfo(channelId);
if (callInfo.hasActiveCall) {
  console.log('Active participant:', callInfo.activeCall?.participants);
}
```

### Get Call History
```typescript
const history = await videocallsApi.getCallHistory(
  channelId,
  limit = 10,
  skip = 0
);
console.log(history.calls);
```

### Get User Stats
```typescript
const stats = await videocallsApi.getUserCallStats();
console.log(`Total calls: ${stats.totalCalls}`);
console.log(`Initiated: ${stats.initiatedCalls}`);
console.log(`Participated: ${stats.participatedCalls}`);
```

### Direct Database Queries

**Get active calls:**
```javascript
db.channels.find({ activeCall: { $exists: true, $ne: null } })
```

**Get user's call history:**
```javascript
db.call_history.find({
  $or: [
    { initiatorId: ObjectId("userId") },
    { participantIds: ObjectId("userId") }
  ]
}).sort({ startedAt: -1 })
```

**Get channel's call history:**
```javascript
db.call_history.find({ channelId: "general" }).sort({ startedAt: -1 })
```

**Calculate user stats:**
```javascript
db.call_history.aggregate([
  {
    $match: {
      $or: [
        { initiatorId: ObjectId("userId") },
        { participantIds: ObjectId("userId") },
      ]
    }
  },
  {
    $group: {
      _id: null,
      totalDuration: { $sum: "$duration" },
      totalCalls: { $sum: 1 },
      averageDuration: { $avg: "$duration" }
    }
  }
])
```

---

## 🐛 Debugging Checklist

### Users Can't See Active Call Prompt

**Symptoms:**
- User1 starts call, User2 doesn't see "Active Video Call" button
- User2 sees "Start a Video Call" instead

**Check:**
1. Is socket connected? Open DevTools → Network → WS
   - Should see `socket.io/?token=...`
   - Status should be `101 Switching Protocols`
2. Is socket joined to correct room?
   - Add console.log in socket connection
   - Should join `channel-${channelId}` format
3. Are events being emitted to correct room?
   - Check [socket room naming issue](VIDEOCALL_ISSUES_AND_FIXES.md#1--critical-socket-room-naming-inconsistency)
   - Ensure `io.to(\`channel-${channelId}\`).emit(...)` format

**Quick Fix:**
```javascript
// In browser console while on channel
// Check if socket rooms
console.log(io.sockets.manager.engine.upgradeManager)

// Check if receiving events
socket.onAny((event, ...args) => console.log('Event:', event, args))
```

### Users Connect to LiveKit but Can't See Each Other

**Symptoms:**
- ChannelVideoCall renders
- No other participants visible
- Call UI shows but no video/audio

**Check:**
1. Is token valid?
   - Token should have `room` and `identity` permissions
   - Check JWT payload: `jwt.io` paste token
2. Is room name consistent?
   - startCall: `generateRoomName()` should prefix with `channel-`
   - joinCall: Should use same room name
3. Is LiveKit server running?
   - Ping: `curl http://localhost:7880/health` or production URL
   - Check LIVEKIT_URL environment variable

**Debug:**
```typescript
// In ChannelVideoCall.tsx
<LiveKitRoom
  // Add debug logging
  onConnect={() => console.log('Connected to LiveKit!')}
  onDisconnect={() => console.log('Disconnected')}
  onParticipantConnected={(participant) => 
    console.log('Participant joined:', participant.identity)
  }
>
  <VideoConference />
</LiveKitRoom>
```

### Call Duration Shows 0

**Symptoms:**
- Call ends but shows "Duration: 0s"
- Statistics show 0 for all durations

**Check:**
1. Is `callStarted` state being set?
   - Check if ChannelVideoCall component received token
2. Is interval running?
   - Open DevTools → check if interval is incrementing
3. Is duration being sent to API?
   - Check Network tab for endCall request body

**Quick Fix:** Check if call duration calculation is actually running

```typescript
// In ChannelVideoCall.tsx
useEffect(() => {
  if (callStarted) {
    console.log('Starting duration counter'); // ← Add
    durationInterval.current = setInterval(() => {
      console.log('Duration tick'); // ← Add
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }
  // ...
}, [token, url, roomName, callStarted]);
```

### Recording Not Saved

**Symptoms:**
- Recording button visible
- No recording file created
- `recordingUrl` is empty in database

**Check:**
1. Was `recordingEnabled` flag set?
   - Query: `db.call_history.findOne({}, {recordingEnabled: 1})`
2. Is LiveKit recording configured?
   - Check LiveKit server config has recording enabled
3. Is storage backend configured?
   - Check documentation for your LiveKit deployment

**Workaround:** For now, disable recording feature until fully implemented

---

## 📈 Performance Tips

### Optimize Call History Queries
```typescript
// BAD: Loads entire channel history
const history = await CallHistoryModel.find({ channelId });

// GOOD: With pagination
const history = await CallHistoryModel
  .find({ channelId })
  .limit(10)
  .skip(page * 10)
  .lean(); // Don't load full Mongoose documents

// BETTER: Select only needed fields
const history = await CallHistoryModel
  .find({ channelId })
  .select('initiatorId participantIds duration startedAt recordingEnabled')
  .limit(10)
  .skip(page * 10)
  .lean();
```

### Reduce Socket Event Spam
```typescript
// Current: Polls every 5 seconds
useEffect(() => {
  const interval = setInterval(checkForActiveCall, 5000);
  return () => clearInterval(interval);
}, []);

// BETTER: Only poll if needed
useEffect(() => {
  if (hasActiveCall) return; // Stop polling once call starts
  
  const interval = setInterval(checkForActiveCall, 5000);
  return () => clearInterval(interval);
}, [hasActiveCall]);
```

### Batch Database Operations
```typescript
// Instead of adding participants one by one
const participants = [...newParticipants];
await ChannelModel.updateOne(
  { channelId },
  { $addToSet: { 'activeCall.participants': { $each: participants } } }
);
```

---

## 🧪 Testing Scenarios

### Scenario 1: Simple Call (2 People)
```
1. User1 opens channel-general
2. User1 clicks "Start Call"
   ✓ See LiveKit UI
3. User2 opens channel-general
   ✓ See "Active Video Call" banner
4. User2 clicks "Join Call"
   ✓ See LiveKit UI
5. Both see each other
6. User1 clicks "Leave Call"
   ✓ User1: UI closes, returns to prompt
   ✓ User2: Sees "Call ended" notification
7. Check call history
   ✓ Shows User1 & User2 as participants
   ✓ Duration > 0
```

### Scenario 2: Multiple Joins
```
1. User1 starts call
2. User2 joins
3. User3 joins (mid-call)
   ✓ User3 sees User1 & User2
   ✓ User1 & User2 see User3 appear
4. User2 leaves (mid-call)
   ✓ Call continues
   ✓ User1 & User3 still connected
5. User1 ends call
   ✓ User3 disconnected immediately
6. Check call history
   ✓ All 3 users listed as participants
```

### Scenario 3: Recording
```
1. User1 starts call with recording enabled
2. User2 joins
3. Record conversation for 30 seconds
4. User1 enables recording mid-call (if not auto-enabled)
5. User1 ends call
6. Check call history
   ✓ recordingEnabled = true
   ✓ recordingUrl populated
   ✓ Can download recording (future feature)
```

---

## 🔍 Monitoring & Logging

### Key Metrics to Track
```
1. Active call count
   - Query: db.channels.count({ activeCall: { $ne: null } })

2. Average call duration
   - Query: db.call_history.aggregate([{$avg: "$duration"}])

3. Concurrent participants
   - Query: max(db.channels.activeCall.participants.length)

4. Socket connections
   - Check: io.engine.clientsCount

5. LiveKit room count
   - Query: livekit API /rooms
```

### Log Important Events
```typescript
// Controller should log:
console.log(`[${new Date().toISOString()}] Call started`, {
  callId: callHistory._id,
  channelId,
  userId,
  roomName,
  recordingEnabled
});

// Socket should log:
console.log(`[${new Date().toISOString()}] User joined channel`, {
  socketId: socket.id,
  userId: socket.data.userId,
  channelId
});

// Service errors should log:
console.error(`[${channelId}] LiveKit error`, {
  error: error.message,
  timestamp: new Date().toISOString()
});
```

---

## 📚 Further Reading

- [LiveKit Documentation](https://docs.livekit.io/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [MongoDB Indexing Guide](https://docs.mongodb.com/manual/indexes/)
- [Express Middleware Patterns](https://expressjs.com/en/guide/using-middleware.html)

---

## 🚀 Deployment Checklist

- [ ] Update `.env` with production LIVEKIT_URL
- [ ] Update `.env` with production JWT_SECRET (use strong random)
- [ ] Enable HTTPS for WebSocket (wss://)
- [ ] Set up CORS properly for production domain
- [ ] Configure LiveKit recording storage backend
- [ ] Set up database backups
- [ ] Enable call history retention cleanup
- [ ] Set up rate limiting on all endpoints
- [ ] Configure monitoring/alerting for active calls
- [ ] Test end-to-end call flow in production
- [ ] Document LiveKit webhook configuration
- [ ] Set up call duration limits
- [ ] Enable socket.io Redis adapter for multi-server setup

---

## ❓ FAQ

**Q: What happens if LiveKit server goes down?**
A: Users will see "Failed to initialize video call" error. No fallback to audio-only currently.

**Q: Can users record calls themselves?**
A: Recording depends on LiveKit server configuration. Client can enable flag but server must have recording configured.

**Q: Is there a participant limit?**
A: No limit configured in code. LiveKit limits approximately based on server resources (typically 50-100 concurrent).

**Q: Do calls transfer between devices?**
A: No, each browser tab creates new connection. Switching tabs = leaving call.

**Q: Is call content encrypted?**
A: LiveKit handles encryption. Control messages use HTTPS/WSS. Media uses DTLS-SRTP.

**Q: Can users see call history?**
A: Yes, `CallHistoryView` component displays paginated history per channel.

