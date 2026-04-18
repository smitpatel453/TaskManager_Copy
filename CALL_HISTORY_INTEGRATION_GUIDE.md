# Call History Message Integration Guide

## Overview
This guide shows how to implement WhatsApp-like call history display in your messaging system.

## Features
✅ Display voice and video calls as messages in the channel
✅ Show call duration and participant information
✅ Display call status (completed, missed, declined)
✅ Automatic timestamps
✅ Fully styled and responsive

---

## Backend Integration

### 1. When Call Ends (in your videocalls controller)

```typescript
import { CallEventLogger } from '../services/callEventLogger.service';

// After a call ends, log the event
await CallEventLogger.logCallEvent(
  channelId,
  callHistoryId,
  initiatorUserId
);
```

### 2. Update your videocalls.controller.ts

Add this to your call-end handler:

```typescript
import { CallEventLogger } from '../services/callEventLogger.service';

export async function endCall(req: Request) {
  // ... your existing code ...

  // After saving call history
  const callHistory = await CallHistoryModel.findById(callHistoryId);
  
  if (callHistory) {
    // Log the call as a message in the channel
    await CallEventLogger.logCallEvent(
      channelId,
      callHistoryId,
      req.user._id  // initiator ID
    );
  }

  // ... rest of code ...
}
```

---

## Frontend Integration

### 1. Import the Component in Your Channel Page

```typescript
import { CallHistoryMessage } from '../components/chat/CallHistoryMessage';
```

### 2. Update Your Message Rendering Logic

In your channel `[id]/page.tsx`, update the message rendering:

```typescript
// Find this section where you render messages
{messages.map((message) => (
  <div key={message._id}>
    
    {/* Existing text message rendering */}
    {message.messageType === 'text' && (
      <div className="flex gap-2">
        <Avatar name={/* ... */} />
        <div className="flex-1">
          {/* Your existing message UI */}
        </div>
      </div>
    )}

    {/* NEW: Call history message rendering */}
    {message.messageType === 'call' && message.callHistory && (
      <CallHistoryMessage
        data={message.callHistory}
        sender={message.sender}
        createdAt={message.createdAt}
        isOwn={message.sender._id === currentUserId}
      />
    )}

  </div>
))}
```

### 3. Update Message Type Definition

Update your message interface:

```typescript
interface Message extends Omit<ChannelMessage, "_id" | "channelId" | "createdAt" | "updatedAt"> {
  _id?: string;
  channelId?: string;
  text?: string;
  sender: Member | null;
  createdAt: string | Date;
  messageType?: 'text' | 'call' | 'system';
  callHistory?: {
    type: 'voice' | 'video';
    duration: number;
    participants: Array<{ _id: string; firstName: string; lastName: string }>;
    initiatorId: string;
    status: 'completed' | 'missed' | 'declined';
  };
  // ... other fields
}
```

---

## Display Examples

### Completed Call
```
📹 Call ended
☎️ You called John Doe
⏱️ 5m 23s
23 ago
```

### Missed Call
```
📹 Missed call
☎️ John Doe called you
missed call badge
```

### Outgoing Call (Group)
```
☎️ Call ended
☎️ You called John, Jane, Bob
⏱️ 12m 45s
1h ago
```

---

## Call Status Definitions

- **completed**: Call was answered and ended normally
- **missed**: Call was not answered (0 duration)
- **declined**: Call was actively rejected

---

## Socket Event Integration (Optional)

For real-time call logging, emit a socket event:

```typescript
// In your livekit.service.ts or call handler
socket.emit('call-ended', {
  channelId: roomName,
  callHistoryId: callId,
  initiatorId: userId,
  type: 'voice' | 'video',
  duration: seconds,
  participants: [...]
});
```

And on the frontend listener:

```typescript
import { CallEventLogger } from '../services/callEventLogger.service';

socket.on('call-ended', (data) => {
  // Fetch updated messages with call event
  refetchMessages();
});
```

---

## Styling Customization

The component uses CSS variables:
- `--bg-surface`: Background color
- `--text-primary`: Primary text
- `--text-muted`: Muted text
- `--accent`: Accent color

All styles are in `CallHistoryMessage.tsx` with light/dark mode support.

---

## Database Changes

The `ChannelMessageSchema` now includes:

```typescript
messageType: 'text' | 'call' | 'system'
callHistory: {
  type: 'voice' | 'video',
  duration: number,
  participants: Array<{ _id, firstName, lastName }>,
  initiatorId: ObjectId,
  status: 'completed' | 'missed' | 'declined',
  callHistoryId: ObjectId
}
isSystemMessage: boolean
```

---

## Migration (if existing database)

To migrate existing entries:

```typescript
db.channel_messages.updateMany(
  { messageType: { $exists: false } },
  { $set: { messageType: 'text', isSystemMessage: false } }
);
```

---

## Features to Add Later

- [ ] Click call to see details/replay recording
- [ ] Search call history
- [ ] Call statistics dashboard
- [ ] Call notifications
- [ ] Call analytics

---

## Troubleshooting

**Q: Call messages not appearing?**
- Ensure `messageType` is set to 'call'
- Check that `callHistory` object is populated
- Verify `CallEventLogger.logCallEvent()` is called after call ends

**Q: Styling looks off?**
- Check that CSS variables are properly set
- Verify dark mode classes are applied
- Clear browser cache

**Q: Timestamps not showing correctly?**
- Ensure `createdAt` is a valid Date
- Check timezone settings on server and client

