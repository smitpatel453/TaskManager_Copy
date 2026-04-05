# Videocall Flow Diagrams

## Sequence Diagram: Starting a Video Call

```mermaid
sequenceDiagram
    actor User1
    participant ChannelCallPrompt
    participant videocallsApi
    participant Backend as Backend API
    participant LiveKit as LiveKit Service
    participant Database as MongoDB
    participant Socket as Socket.IO
    participant User2 as User 2 (Other Users)

    User1->>ChannelCallPrompt: Click "Start Call"
    ChannelCallPrompt->>ChannelCallPrompt: Set loading state
    ChannelCallPrompt->>videocallsApi: startCall(channelId, recordingEnabled)
    
    videocallsApi->>Backend: POST /videocalls/:channelId/start-call
    
    Backend->>Database: Find Channel
    Backend->>Database: Find User (User1)
    
    Backend->>LiveKit: generateLiveKitToken(userId, userName, roomName)
    LiveKit-->>Backend: Return token + url
    
    Backend->>Database: Update Channel.activeCall
    Backend->>Database: Create CallHistory record
    
    Backend->>Socket: Emit 'channel:call-started' to all in channel
    Socket->>User2: Notify call started
    
    Backend-->>videocallsApi: Return {token, url, roomName, callId}
    videocallsApi-->>ChannelCallPrompt: Success response
    
    ChannelCallPrompt->>ChannelCallPrompt: Update state & unblock UI
    ChannelCallPrompt->>ChannelCallPrompt: Call onStartCall() callback
    
    User1->>ChannelVideoCall: Pass token, url, roomName
    ChannelVideoCall->>LiveKit: Connect to room with token
    User1->>User1: View video conference UI
```

---

## Sequence Diagram: Joining an Existing Call

```mermaid
sequenceDiagram
    actor User2
    participant ChannelCallPrompt
    participant videocallsApi
    participant Backend as Backend API
    participant LiveKit as LiveKit Service
    participant Database as MongoDB
    participant Socket as Socket.IO
    participant User1 as User 1 (Initiator)

    User2->>ChannelCallPrompt: Sees "Active Call" - clicks "Join"
    ChannelCallPrompt->>videocallsApi: joinCall(channelId)
    
    videocallsApi->>Backend: POST /videocalls/:channelId/join-call
    
    Backend->>Database: Find Channel (verify activeCall exists)
    Backend->>Database: Find User (User2)
    
    alt activeCall exists
        Backend->>LiveKit: generateLiveKitToken(userId, userName, roomName)
        LiveKit-->>Backend: Return token + url
        
        Backend->>Database: Add User2 to activeCall.participants
        
        Backend->>Socket: Emit 'channel:call-user-joined' event
        Socket->>User1: Notify user joined
        
        Backend-->>videocallsApi: Return {token, url, roomName}
    else No active call
        Backend-->>videocallsApi: Return error 400
    end
    
    User2->>ChannelVideoCall: Pass token, url, roomName
    ChannelVideoCall->>LiveKit: Connect to existing room
    User2->>User1: Now visible in video conference
```

---

## Sequence Diagram: Ending a Call

```mermaid
sequenceDiagram
    actor User1
    participant ChannelVideoCall
    participant videocallsApi
    participant Backend as Backend API
    participant Database as MongoDB
    participant Socket as Socket.IO
    participant OtherUsers as All Channel Users

    User1->>ChannelVideoCall: Click "Leave Call"
    ChannelVideoCall->>videocallsApi: endCall(channelId, callId)
    
    videocallsApi->>Backend: POST /videocalls/:channelId/end-call
    
    Backend->>Database: Find Channel & activeCall
    Backend->>Backend: Calculate duration (now - startedAt)
    
    Backend->>Database: Update CallHistory (endedAt, duration)
    Backend->>Database: Clear Channel.activeCall = null
    
    Backend->>Socket: Emit 'channel:call-ended' {duration, callId}
    Socket->>OtherUsers: Notify all users call ended
    
    Backend-->>videocallsApi: Return {success, duration}
    ChannelVideoCall->>ChannelVideoCall: Clear state & disconnect
    User1->>ChannelCallPrompt: Return to start call UI
    OtherUsers->>ChannelCallPrompt: Show "Start Call" button again
```

---

## State Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> NoActiveCall: Channel initialized
    
    NoActiveCall --> WaitingForCall: User polls / Watches socket
    WaitingForCall --> NoActiveCall: Timeout or error
    
    WaitingForCall --> InitiatingCall: User clicks "Start Call"
    
    InitiatingCall --> FailedToStart: LiveKit unavailable
    InitiatingCall --> ActiveCall: Token generated
    
    FailedToStart --> NoActiveCall: Show error, retry
    
    ActiveCall --> ActiveCall: User1 in room\nLiveKit streaming started
    
    ActiveCall --> MoreParticipants: User2 joins\nParticipants list updated
    ActiveCall --> RecordingStarted: User enables recording\nrecordingEnabled flag set
    
    MoreParticipants --> MoreParticipants: More users join\nParticipants added
    MoreParticipants --> MoreParticipants: User leaves\nParticipants removed
    
    RecordingStarted --> MoreParticipants: Recording in progress
    
    ActiveCall --> CallEnding: Last user leaves\nor initiator ends call
    MoreParticipants --> CallEnding: Initiator clicks "End"
    RecordingStarted --> CallEnding: Call duration exceeded\nor manual end
    
    CallEnding --> CallEnded: Duration calculated\nCallHistory saved
    
    CallEnded --> NoActiveCall: activeCall cleared\nUsers see "Start Call" again
    
    note right of ActiveCall
        LiveKit room active
        Participants streaming
    end note
    
    note right of MoreParticipants
        Each join updates DB
        Emits socket event
    end note
    
    note right of RecordingStarted
        recordingEnabled = true
        RecordingUrl stored when done
    end note
```

---

## Data Flow: Call History Statistics

```mermaid
stateDiagram-v2
    [*] --> UserInitiatesCall: User starts call
    
    UserInitiatesCall --> CallHistoryCreated: Stored in DB\nWith initiatorId
    
    UserJoinsCall --> CallHistoryUpdated: participantIds[]\nappends user
    
    CallEnded --> DurationCalculated: endedAt - startedAt
    
    DurationCalculated --> CallHistorySaved: Stored with:\n- duration (seconds)\n- participants list\n- timestamp
    
    CallHistorySaved --> UserCallStats: User views stats
    
    UserCallStats --> StatCalculation: Aggregation pipeline:\n1. Match initiatorId or in participantIds\n2. Sum durations\n3. Count calls\n4. Average duration
    
    StatCalculation --> DisplayStats: Show to user\n- Total calls\n- Calls initiated\n- Calls participated\n- Total/Avg duration
```

---

## Component Interaction Tree

```
Frontend Entry Point
│
└─ Channel View Page
   │
   ├─ ChannelCallPrompt.tsx
   │  ├─ State: hasActiveCall, activeParticipants, recordingEnabled
   │  ├─ Effects:
   │  │  ├─ Poll checkForActiveCall() every 5s
   │  │  └─ Listen to socket events:
   │  │     ├─ 'channel:call-started'
   │  │     ├─ 'channel:call-ended'
   │  │     ├─ 'channel:call-user-joined'
   │  │     └─ 'channel:call-user-left'
   │  └─ Callbacks: onStartCall(), onJoinCall()
   │
   ├─ ChannelVideoCall.tsx (conditionally rendered)
   │  ├─ Props: token, url, roomName, callId
   │  ├─ State: callDuration, isRecording, screenShareActive
   │  ├─ Children: LiveKitRoom component
   │  │  └─ VideoConference (UI controls)
   │  └─ Handlers:
   │     ├─ handleEnableRecording()
   │     ├─ handleLeaveRoom()
   │     └─ formatDuration()
   │
   └─ CallHistoryView.tsx / UserCallStatsView.tsx (separate section)
      ├─ Load call history on mount
      ├─ Load user statistics on mount
      └─ Display formatted data

API Layer (videocallsApi)
│
├─ startCall(channelId, recordingEnabled)
├─ joinCall(channelId)
├─ leaveCall(channelId)
├─ endCall(channelId, callId)
├─ getCallInfo(channelId)
├─ getCallHistory(channelId, limit, skip)
├─ enableRecording(channelId, callId)
└─ getUserCallStats()

Backend Layer
│
├─ videocalls.routes.ts
│  └─ 8 endpoints (all require authMiddleware)
│
├─ videocalls.controller.ts
│  ├─ startChannelVideoCall()
│  ├─ joinChannelVideoCall()
│  ├─ endChannelVideoCall()
│  ├─ leaveChannelVideoCall()
│  ├─ getChannelCallInfo()
│  ├─ getChannelCallHistory()
│  ├─ enableRecording()
│  └─ getUserCallStats()
│
├─ livekit.service.ts
│  ├─ generateLiveKitToken()
│  ├─ generateRoomName()
│  └─ handleLiveKitWebhook() [optional]
│
└─ socket.ts
   ├─ Socket.IO initialization
   ├─ Authentication middleware
   ├─ Room bootstrap (join channels on connect)
   ├─ Event handlers:
   │  ├─ join_channel
   │  ├─ leave_channel
   │  ├─ send_message
   │  └─ disconnect
   └─ Event emitters:
      ├─ channel:call-started
      ├─ channel:call-ended
      ├─ channel:call-user-joined
      ├─ channel:call-user-left
      └─ channel:recording-enabled

Database
│
├─ ChannelModel
│  └─ activeCall: { roomName, startedAt, participants[] }
│
├─ CallHistoryModel
│  ├─ channelId
│  ├─ roomName
│  ├─ initiatorId (ref: users)
│  ├─ participantIds (ref: users)
│  ├─ startedAt / endedAt
│  ├─ duration
│  ├─ recordingUrl
│  ├─ recordingEnabled
│  └─ Index: { channelId: 1, startedAt: -1 }
│
└─ UserModel (referenced in calls)

External Services
│
└─ LiveKit
   ├─ generateLiveKitToken (via backend)
   ├─ Connect room (frontend component)
   ├─ Stream audio/video
   ├─ Optionally: recording
   └─ Webhook events (optional)
```

---

## Error Handling Flow

```mermaid
graph TD
    A["User Action<br/>(Start/Join/End Call)"] --> B["Frontend API Call"]
    
    B --> C{HTTP Status?}
    
    C -->|200 OK| D["Success Handler"]
    D --> E["Update Local State"]
    E --> F["Update UI"]
    
    C -->|400 Bad Request| G["Validation Error"]
    G --> G1["Missing credentials<br/>or invalid input"]
    G1 --> H["Show Error Toast"]
    
    C -->|404 Not Found| I["Resource Error"]
    I --> I1["Channel or User<br/>not found"]
    I1 --> H
    
    C -->|500 Server Error| J["Server Error"]
    J --> J1["LiveKit unavailable<br/>or DB error"]
    J1 --> H
    
    C -->|Network Error| K["Network Error"]
    K --> K1["Connection timeout<br/>or offline"]
    K1 --> H
    
    H --> L["Log to console"]
    L --> M["Retry available?"]
    
    M -->|Yes| N["Show Retry Button"]
    M -->|No| O["Show Help/Support Info"]
```

---

## LiveKit Integration Points

```
┌─────────────────────────────────────────────────────┐
│                YOUR APPLICATION                     │
└─────────────────────────────────────────────────────┘
              │                            │
         [1] │ generateLiveKitToken()     │ [5] Connect with token
              │ (Backend)                   │
              ▼                            ▼
┌─────────────────────────────────────────────────────┐
│  LiveKit Server Service                             │
│  (LIVEKIT_URL from env)                            │
│                                                     │
│  Generates Access Token with:                       │
│  - room (channel name)                              │
│  - roomJoin (true)                                  │
│  - canPublish (true)                                │
│  - canPublishData (true)                            │
│  - canSubscribe (true)                              │
└─────────────────────────────────────────────────────┘
              │
    [2] JWT Token with credentials
              │
         [3] Frontend receives token
              │
         [4] Frontend creates room connection
              │
        ┌─────────────────────────────┐
        │  LiveKit Room               │
        │  - Media streaming          │
        │  - Participant management   │
        │  - Recording (optional)     │
        │  - Data channel messaging   │
        └─────────────────────────────┘


Environment Configuration:
LIVEKIT_URL=
  └─ Development: http://localhost:7880
  └─ Production: https://livekit.yourdomain.com

LIVEKIT_API_KEY=
  └─ Used to sign tokens

LIVEKIT_API_SECRET=
  └─ Signing secret (keep private)
```

---

## Call Duration Calculation

```
Timeline:
═════════════════════════════════════════════════════

User1 starts call
│
│ activeCall.startedAt = NOW
├─────────────────┐
│                 │
User2 joins       │ (participants array grows)
│                 │
user3 joins       │
│                 │
User1 ends call   │
│                 └─────────────────────────────► endedAt = NOW
│
│ Duration = (endedAt - startedAt) in seconds
│
CallHistory saved:
{
  startedAt: "2024-04-05T10:30:00Z",
  endedAt: "2024-04-05T10:45:30Z",
  duration: 930  // seconds
}

For Statistics:
- totalDuration = SUM of all durations for user
- averageDuration = totalDuration / numberOfCalls
```

---

## Socket Event Flow Diagram

```mermaid
graph LR
    subgraph Server["Backend Server"]
        Controller["Videocall Controller"]
        Socket["Socket.IO Server"]
    end
    
    subgraph Clients["Connected Clients"]
        Client1["User1 Browser"]
        Client2["User2 Browser"]
        Client3["User3 Browser"]
    end
    
    subgraph Events["Socket Events"]
        E1["channel:call-started"]
        E2["channel:call-ended"]
        E3["channel:call-user-joined"]
        E4["channel:call-user-left"]
        E5["channel:recording-enabled"]
    end
    
    Controller -->|Emit to channel room| Socket
    Socket -->|Broadcast| Client1
    Socket -->|Broadcast| Client2
    Socket -->|Broadcast| Client3
    
    Socket --> E1
    Socket --> E2
    Socket --> E3
    Socket --> E4
    Socket --> E5
    
    Client1 -->|Listen| E1
    Client1 -->|Listen| E2
    Client1 -->|Listen| E3
    Client1 -->|Listen| E4
    Client1 -->|Listen| E5
    
    Client2 -->|Listen| E1
    Client2 -->|Listen| E2
    Client2 -->|Listen| E3
    Client2 -->|Listen| E4
    Client2 -->|Listen| E5
    
    Client3 -->|Listen| E1
    Client3 -->|Listen| E2
    Client3 -->|Listen| E3
    Client3 -->|Listen| E4
    Client3 -->|Listen| E5
```

