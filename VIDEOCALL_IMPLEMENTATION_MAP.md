# Videocall Implementation Architecture Map

## 1. FRONTEND COMPONENTS

### [frontend/app/components/videocalls/ChannelCallPrompt.tsx](frontend/app/components/videocalls/ChannelCallPrompt.tsx)
**Purpose:** Shows call status and allows users to start/join video calls in channels
**Key Functionality:**
- Checks for active calls on component mount (5-second polling)
- Listens for real-time socket events (`channel:call-started`, `channel:call-ended`)
- Recording toggle checkbox
- Displays active participants and call status
- Loading states during call start/join

**Key Functions:**
- `checkForActiveCall()` - Polls API for active call status
- `handleStartCall()` - Initiates new video call with optional recording
- `handleJoinCall()` - Joins existing active call

**Socket Events Listened:**
- `channel:call-started` - Updates UI when call begins
- `channel:call-ended` - Clears active call state

**Integration Points:**
- Uses `videocallsApi.getCallInfo()`, `videocallsApi.startCall()`, `videocallsApi.joinCall()`
- Emits `onStartCall()` and `onJoinCall()` callbacks with token, URL, roomName

---

### [frontend/app/components/videocalls/ChannelVideoCall.tsx](frontend/app/components/videocalls/ChannelVideoCall.tsx)
**Purpose:** Main video conference component using LiveKit
**Key Functionality:**
- Initializes LiveKit room with token and URL
- Tracks call duration (incremented every second)
- Recording controls and status display
- Screen share functionality toggle
- Graceful leave/end call handling

**Key Functions:**
- `handleEnableRecording()` - Enables recording via API
- `handleLeaveRoom()` - Leaves call or ends it (if initiator)
- `formatDuration()` - Formats call duration as HH:MM:SS

**UI Features:**
- Call info bar showing channel name, duration, recording status
- Recording button (enabled when call is active)
- Screen share button
- Leave call button

**Integration Points:**
- Calls `videocallsApi.enableRecording()`, `videocallsApi.endCall()`, `videocallsApi.leaveCall()`
- Connected to LiveKit via `@livekit/components-react` library
- Props: `token`, `url`, `roomName`

---

### [frontend/app/components/videocalls/CallHistoryView.tsx](frontend/app/components/videocalls/CallHistoryView.tsx)
**Purpose:** Displays past call history and user statistics
**Key Features:**
- `CallHistoryView` - Shows list of completed calls with:
  - Initiator name
  - Recording status badge
  - Date/time formatted
  - Participant count and duration
  
- `UserCallStatsView` - Statistics dashboard showing:
  - Calls initiated
  - Calls participated in
  - Total duration
  - Average duration

**Key Functions:**
- Loads history on mount via `videocallsApi.getCallHistory()`
- Loads stats via `videocallsApi.getUserCallStats()`
- Format helpers for dates and durations

---

## 2. FRONTEND API LAYER

### [frontend/src/api/videocalls.api.ts](frontend/src/api/videocalls.api.ts)
**Purpose:** API client wrapper for videocall endpoints

**Exported Types:**
```typescript
VideoCallToken {
  token: string;
  url: string;
  roomName: string;
  channelId: string;
  callId?: string;
  recordingEnabled?: boolean;
}

CallInfo {
  hasActiveCall: boolean;
  activeCall?: {
    roomName: string;
    startedAt: string;
    participants: Array<User>;
  };
}

CallHistory {
  _id: string;
  channelId: string;
  roomName: string;
  initiatorId: User;
  participantIds: User[];
  startedAt: string;
  endedAt?: string;
  duration: number; // seconds
  recordingUrl?: string;
  recordingEnabled: boolean;
}

UserCallStats {
  initiatedCalls: number;
  participatedCalls: number;
  totalDuration: number;
  averageDuration: number;
  totalCalls: number;
}
```

**API Methods:**
- `startCall(channelId, recordingEnabled)` - POST `/videocalls/{channelId}/start-call`
- `joinCall(channelId)` - POST `/videocalls/{channelId}/join-call`
- `leaveCall(channelId)` - POST `/videocalls/{channelId}/leave-call`
- `endCall(channelId, callId)` - POST `/videocalls/{channelId}/end-call`
- `getCallInfo(channelId)` - GET `/videocalls/{channelId}/call-info`
- `getCallHistory(channelId, limit, skip)` - GET `/videocalls/{channelId}/history?limit={limit}&skip={skip}`
- `enableRecording(channelId, callId)` - POST `/videocalls/{channelId}/enable-recording`
- `getUserCallStats()` - GET `/videocalls/stats/user-stats`

---

## 3. BACKEND ROUTES

### [backend/src/routes/videocalls.routes.ts](backend/src/routes/videocalls.routes.ts)
**All routes protected with `authMiddleware`**

| Method | Route | Controller | Purpose |
|--------|-------|-----------|---------|
| POST | `/:channelId/start-call` | `startChannelVideoCall` | Initiate new call |
| POST | `/:channelId/join-call` | `joinChannelVideoCall` | Join existing call |
| POST | `/:channelId/end-call` | `endChannelVideoCall` | End entire call |
| POST | `/:channelId/leave-call` | `leaveChannelVideoCall` | User leaves call |
| GET | `/:channelId/call-info` | `getChannelCallInfo` | Get active call status |
| GET | `/:channelId/history` | `getChannelCallHistory` | Get call history |
| POST | `/:channelId/enable-recording` | `enableRecording` | Enable recording |
| GET | `/stats/user-stats` | `getUserCallStats` | Get user statistics |

---

## 4. BACKEND CONTROLLER

### [backend/src/controllers/videocalls.controller.ts](backend/src/controllers/videocalls.controller.ts)
**Purpose:** Handle videocall request logic and database operations

**Functions:**

#### `startChannelVideoCall(req, res)`
**Flow:**
1. Validate userId and channelId
2. Find channel and user in database
3. Generate room name via `liveKitService.generateRoomName()`
4. Generate LiveKit access token via `liveKitService.generateLiveKitToken()`
5. Update channel with `activeCall` object containing:
   - roomName
   - startedAt (current time)
   - participants: [userId]
6. Create CallHistory document
7. Emit socket event `channel:call-started` to all channel members
8. Return token, url, roomName, callId, recordingEnabled

**Error Handling:**
- 400: Missing userId or channelId
- 404: Channel or user not found
- 500: LiveKit token generation failure

---

#### `joinChannelVideoCall(req, res)`
**Flow:**
1. Validate userId and channelId
2. Find channel (require activeCall exists)
3. Generate LiveKit token for existing room
4. Add userId to activeCall.participants (if not already present)
5. Emit socket event `channel:call-user-joined` to all channel members
6. Return token, url, roomName, channelId

**Error Handling:**
- 400: Missing credentials or no active call
- 404: Channel or user not found

---

#### `endChannelVideoCall(req, res)`
**Flow:**
1. Validate userId, channelId, callId
2. Calculate call duration from activeCall.startedAt to now
3. Update CallHistory with endedAt and duration
4. Set channel.activeCall = null
5. Emit socket event `channel:call-ended` with duration info
6. Return success and duration

**Error Handling:**
- 400: Missing credentials or no active call
- 404: Channel not found

---

#### `leaveChannelVideoCall(req, res)`
**Flow:**
1. Validate userId and channelId
2. Remove userId from activeCall.participants
3. If no participants left, set activeCall = null and auto-end call
4. Emit socket event `channel:call-user-left`
5. Return success

**Error Handling:**
- 400: Missing credentials or no active call
- 404: Channel not found

---

#### `getChannelCallInfo(req, res)`
**Returns:**
```json
{
  "hasActiveCall": true/false,
  "activeCall": {
    "roomName": "channel-xyz",
    "startedAt": "ISO date",
    "participants": [{ _id, firstName, lastName }, ...]
  }
}
```
**Populates participant details for display in UI**

---

#### `getChannelCallHistory(req, res)`
**Query Params:**
- `limit`: Number of records (default: 10)
- `skip`: Pagination offset (default: 0)

**Returns:**
```json
{
  "calls": [
    {
      "_id": "...",
      "channelId": "...",
      "roomName": "...",
      "initiatorId": { _id, firstName, lastName, email },
      "participantIds": [...],
      "startedAt": "ISO date",
      "endedAt": "ISO date",
      "duration": 3600,
      "recordingUrl": "https://...",
      "recordingEnabled": true
    }
  ],
  "total": 42,
  "limit": 10,
  "skip": 0
}
```

---

#### `enableRecording(req, res)`
**Flow:**
1. Validate userId, channelId, callId
2. Verify activeCall exists
3. Update CallHistory document: `recordingEnabled = true`
4. Emit socket event `channel:recording-enabled`
5. Return success

---

#### `getUserCallStats(req, res)`
**Returns:**
```json
{
  "initiatedCalls": 15,
  "participatedCalls": 42,
  "totalDuration": 180000,
  "averageDuration": 2857,
  "totalCalls": 57
}
```
**Uses MongoDB aggregation to calculate:**
- Count initiated calls (user = initiatorId)
- Count participated calls (user in participantIds)
- Sum of all durations
- Tallying total calls

---

## 5. BACKEND SERVICE LAYER

### [backend/src/services/livekit.service.ts](backend/src/services/livekit.service.ts)
**Purpose:** LiveKit integration and token generation

**Configuration (from env):**
- `LIVEKIT_URL` - WebSocket URL (default: http://localhost:7880)
- `LIVEKIT_API_KEY` - Authentication key
- `LIVEKIT_API_SECRET` - Signing secret

**Exported Functions:**

#### `generateLiveKitToken(params: GenerateTokenParams): LiveKitTokenResponse`
**Params:**
- `userId` - Unique user identifier
- `userName` - Display name for participant
- `roomName` - Target room/channel identifier

**Process:**
1. Create AccessToken using API key and secret
2. Add grant with permissions:
   - `room`: roomName (restrict to specific room)
   - `roomJoin`: true (allow room join)
   - `canPublish`: true (allow audio/video publishing)
   - `canPublishData`: true (allow data channel messages)
   - `canSubscribe`: true (allow subscribing to others' media)
3. Convert to JWT token
4. Return token and LIVEKIT_URL

**Returns:**
```typescript
{
  token: "eyJhbGc...",  // JWT token
  url: "http://localhost:7880" | production URL
}
```

---

#### `generateRoomName(channelId: string): string`
**Process:**
- Prefix with `channel-`
- Convert to lowercase
- Replace invalid characters with dashes
- Result: `channel-xyz123` format

**Example:** `ABC-123_Channel` → `channel-abc-123-channel`

---

#### `handleLiveKitWebhook(body: any): void`
**Optional webhook handler for LiveKit events**
- Logs `participant_joined` events
- Logs `participant_left` events
- Logs `room_closed` events
- Generic logging for other events

---

## 6. INFRASTRUCTURE - REAL-TIME COMMUNICATION

### [backend/src/infrastructure/socket.ts](backend/src/infrastructure/socket.ts)
**Purpose:** WebSocket server for real-time event broadcasting

**Initialization:**
- Uses `socket.io-server-sdk`
- Integrated with Express HTTP server
- CORS configured for frontend

**Authentication:**
- Middleware validates JWT token from socket handshake
- Extracts userId from token payload
- Sets `socket.data.userId`

**Key Features:**

#### Room Management
- **Bootstrap:** On connection, joins user to all channels they're members of
- **Channel Rooms:** Named as `{channelId}` (e.g., "general", "random")

#### Socket Events

**Emitted Events (Server → Client):**
```
channel:call-started
  - callId
  - channelId
  - roomName
  - initiator: { id, name }
  - startedAt
  - recordingEnabled

channel:call-ended
  - callId
  - channelId
  - endedBy (userId)
  - endedAt
  - duration

channel:call-user-joined
  - channelId
  - user: { id, name }

channel:call-user-left
  - channelId
  - userId

channel:recording-enabled
  - callId
  - channelId
  - recordingStartedAt

receive_message
  - Message object with sender details
```

**Listened Events (Client → Server):**
```
join_channel(channelId)
  - Adds socket to channel room
  - Validates channel access

leave_channel(channelId)
  - Removes socket from channel room

send_message(data)
  - Validates permissions
  - Saves to database
  - Broadcasts to all in channel

disconnect
  - Logged for debugging
```

---

## 7. DATABASE MODELS

### [backend/src/models/callHistory.model.ts](backend/src/models/callHistory.model.ts)
**Collection:** `call_history`

**Schema:**
```typescript
{
  channelId: String (indexed, required)
  roomName: String (required)
  initiatorId: ObjectId → users (required, indexed)
  participantIds: [ObjectId] → users (indexed)
  startedAt: Date (default: now, indexed with channelId)
  endedAt: Date (optional)
  duration: Number (seconds, default: 0)
  recordingUrl: String (optional)
  recordingEnabled: Boolean (default: false)
  messagesSent: Number (default: 0)
  createdAt: Date (timestamp, indexed)
  updatedAt: Date (timestamp)
}
```

**Indexes:**
- `{ channelId: 1, startedAt: -1 }` - Query history by channel
- `{ initiatorId: 1 }` - Query user-initiated calls
- `{ participantIds: 1 }` - Query user-participated calls
- `{ createdAt: -1 }` - Sort by creation time

---

### Channel Model Additions (activeCall)
**In:** [backend/src/models/channel.model.ts](backend/src/models/channel.model.ts)

**activeCall Field:**
```typescript
activeCall?: {
  roomName: String
  startedAt: Date
  participants: [ObjectId] → users
} | null
```

**Set during:** `startChannelVideoCall`
**Modified during:** `joinChannelVideoCall` (add participant), `leaveChannelVideoCall` (remove)
**Cleared during:** `endChannelVideoCall`

---

## 8. ENVIRONMENT VARIABLES

### [backend/src/config/env.ts](backend/src/config/env.ts)

**LiveKit Configuration:**
```env
LIVEKIT_URL=http://localhost:7880        # Default for development
LIVEKIT_API_KEY=devkey                   # Default for development
LIVEKIT_API_SECRET=secret                # Default for development
```

**In Production (.env file):**
```env
LIVEKIT_URL=https://livekit-server.example.com
LIVEKIT_API_KEY=your-api-key-here
LIVEKIT_API_SECRET=your-api-secret-here
```

**Other Required:**
```env
MONGODB_URI=mongodb://...
JWT_SECRET=your-jwt-secret
FRONTEND_URL=http://localhost:3000 or https://yourdomain.com
```

---

## COMPLETE FLOW DIAGRAM

```
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ChannelCallPrompt.tsx ──┐                                      │
│  (Start/Join UI)        │                                       │
│                         │                                       │
│  ChannelVideoCall.tsx ◄─┘                                       │
│  (LiveKit UI)            │                                      │
│                          │                                      │
│  CallHistoryView.tsx     │                                      │
│  (History/Stats)         │                                      │
│                          ▼                                      │
│            videocallsApi (HTTP Client)                          │
│                          │                                      │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTP Requests
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND API LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│         videocalls.routes.ts (with authMiddleware)              │
│                                                                 │
│  POST   /:channelId/start-call ────────┐                        │
│  POST   /:channelId/join-call      │   │                       │
│  POST   /:channelId/end-call       │   │                       │
│  POST   /:channelId/leave-call     │   │                       │
│  GET    /:channelId/call-info      ├──┤                        │
│  GET    /:channelId/history        │   videocalls.controller   │
│  POST   /:channelId/enable-recording   │                       │
│  GET    /stats/user-stats          │   │                       │
│                                    └──►│                        │
│                                        │                       │
│                                  (8 controller functions)       │
│                                        │                        │
└────────────────────────────────────────┼──────────────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                    │
                    ▼                    ▼                    ▼
                    │              livekit.service    │  Database Layer
                    │                                 │      │
    ┌──────────────────────┐          ┌────────────────────┐  │
    │  LiveKit Integration │          │  Socket.IO (Real- │  │
    ├──────────────────────┤          │      time)         │  │
    │ generateLiveKit      │          ├────────────────────┤  │
    │   Token()            │          │ Emit Events:       │  │
    │                      │          │ - call-started    │  │
    │ generateRoom        │          │ - call-ended      │  │
    │   Name()            │          │ - call-user-joined │  │
    │                      │          │ - call-user-left   │  │
    │ (Communicates with   │          │ - recording-enable │  │
    │  LiveKit Server at   │          │                    │  │
    │  LIVEKIT_URL)        │          │ Join Rooms:        │  │
    └──────────────────────┘          │ - channel-{id}     │  │
           │                          └────────────────────┘  │
           │                                  │               │
           ▼                                  ▼               ▼
    ┌──────────────────────┐          ┌────────────────┐ ┌──────────────┐
    │  LiveKit Server      │          │ Socket Clients │ │  MongoDB    │
    │  (Actual Media       │          │ (Browsers)     │ │             │
    │   Streaming &        │          │                │ │ Databases:  │
    │   Recording)         │          └────────────────┘ │ - channels  │
    │                      │                             │ - users     │
    │ http://localhost:    │                             │ - call_     │
    │ 7880 (dev)           │                             │   history   │
    │ or production URL    │                             └──────────────┘
    └──────────────────────┘


LIVE CALL STATE DIAGRAM:
═════════════════════════════════════════════════════════════

ChannelModel.activeCall Structure:
{
  roomName: "channel-xyz123",
  startedAt: Date,
  participants: [userId1, userId2, userId3]  // Updated dynamically
}

Flow:
  1. User1 calls startCall()
     ↓
  2. Controller creates activeCall and CallHistory
     ↓
  3. Controller generates LiveKit token
     ↓
  4. Returns token + LiveKit URL to frontend
     ↓
  5. Frontend connects to LiveKit with token
     ↓
  6. User2 calls joinCall()
     ↓
  7. Controller adds User2 to activeCall.participants
     ↓
  8. Controller generates new token for User2
     ↓
  9. User2 connects to same LiveKit room
     ↓
  10. Other users are notified via socket events
      ↓
  11. When call ends: endCall() updates CallHistory with duration
      ↓
  12. activeCall is cleared from channel
```

---

## KEY INTEGRATION POINTS

### 1. Frontend ↔ Backend API
- HTTP requests use Axios client with JWT auth
- VideoCall UI components trigger API calls on user actions
- API returns LiveKit credentials and room info

### 2. Backend ↔ LiveKit Service
- `livekit.service.ts` creates signed JWT tokens
- Tokens grant access to specific rooms
- LiveKit handles actual audio/video streaming

### 3. Backend ↔ Database
- `ChannelModel`: Stores active call state
- `CallHistoryModel`: Logs all call sessions
- `UserModel`: References for participant info

### 4. Backend ↔ WebSocket (Socket.IO)
- Real-time event broadcasting to connected users
- Call-related events: started, ended, joined, left
- Keeps all channel members informed instantly

### 5. Frontend ↔ WebSocket
- React components listen to socket events
- Update UI state when events received
- 5-second polling as backup for call status

---

## CURRENT ISSUES & OBSERVATIONS

### ✅ Strengths
1. **Separation of Concerns:** Clear division between frontend components, API, controller logic, and services
2. **Real-time Updates:** Socket.IO ensures all users see call status instantly
3. **Recording Support:** Optional recording with flag in CallHistory
4. **Call History:** Complete audit trail with participant tracking
5. **Authentication:** Protected routes with JWT middleware
6. **Proper Indexing:** CallHistory has optimized queries for common patterns

### ⚠️ Potential Issues

#### Issue 1: Race Condition on Multiple Joins
**Problem:** If two users call `joinCall()` simultaneously, both might add themselves independently

**Location:** [videocalls.controller.ts](backend/src/controllers/videocalls.controller.ts#L132)
```typescript
if (!channel.activeCall.participants.some((p: any) => p.toString() === userId)) {
    await ChannelModel.findOneAndUpdate(...);
}
```

**Impact:** Possible duplicate participants in array (though `some()` check prevents this)

**Solution:** Use MongoDB `$addToSet` operator (already done, so this is safe)

---

#### Issue 2: Socket Event Room Naming
**Problem:** Socket room names use both formats:
- `channelId` in bootstrap and join_channel
- `channel-${channelId}` in call events

**Location:** 
- [socket.ts](backend/src/infrastructure/socket.ts#L68) - Bootstrap joins `channelId`
- [videocalls.controller.ts](backend/src/controllers/videocalls.controller.ts#L61) - Emits to `channel-${channelId}`

**Impact:** Call events might not reach all connected users

**Fix:** Standardize to use `channel-${channelId}` everywhere

---

#### Issue 3: Memory Leak Risk
**Problem:** Frontend creates new socket instance on every ChannelCallPrompt mount

**Location:** [ChannelCallPrompt.tsx](frontend/app/components/videocalls/ChannelCallPrompt.tsx#L29)
```typescript
const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
```

**Impact:** Multiple socket connections if component remounts

**Fix:** Use singleton pattern or move socket to context/provider

---

#### Issue 4: No Error Handling for LiveKit Connection Failures
**Problem:** If LiveKit server is down, token generation fails but error message is generic

**Location:** [livekit.service.ts](backend/src/services/livekit.service.ts#L25)

**Impact:** Users don't know if issue is server, LiveKit, or network

**Fix:** Add more specific error messages

---

#### Issue 5: Recording Not Actually Implemented
**Problem:** `recordingEnabled` flag is set but never actually triggers LiveKit recording

**Location:** [videocalls.controller.ts](backend/src/controllers/videocalls.controller.ts#L362)

**Impact:** Recording button is visible but doesn't actually record

**Fix:** Integrate LiveKit recording API or webhooks

---

#### Issue 6: Call Duration Calculation
**Problem:** Duration calculated on client-side when leaving, not server-side

**Location:** [ChannelVideoCall.tsx](frontend/app/components/videocalls/ChannelVideoCall.tsx#L73)

**Impact:** If user page crashes/refreshes, duration isn't stored correctly

**Fix:** Server should calculate duration based on actual room closing

---

## RECOMMENDATION FOR FIXES

1. **Standardize Socket Room Names** - Change all controller emissions to use consistent naming
2. **Fix Socket Connection Leak** - Move socket to context provider
3. **Implement Recording** - Use LiveKit recording API
4. **Server-side Duration** - Calculate duration on server when room closes
5. **Webhook Support** - Add LiveKit webhook handler for automatic room close detection
6. **Call Timeout** - Auto-end calls that exceed max duration

