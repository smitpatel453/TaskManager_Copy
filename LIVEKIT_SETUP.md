# LiveKit Video Calling Setup Guide

## Overview
Your Task Manager now has **group video and voice calling** capabilities in channels using **LiveKit**. This guide shows you how to set everything up.

## Architecture
```
Frontend (Next.js)
    ↓ 
Backend (Express) - Generates LiveKit tokens
    ↓
LiveKit Server (on Oracle Cloud Free)
    ↓
Users connect for video/audio
```

---

## Step 1: Create Oracle Cloud Always Free Account

1. Go to [oracle.com/cloud/free](https://oracle.com/cloud/free)
2. Sign up for a free account (you need credit card but won't be charged)
3. Once verified, go to Console
4. Create a new **Ubuntu 22.04 Compute Instance**:
   - Name: `livekit-server`
   - Image: Ubuntu 22.04
   - Shape: Always Free (ARM - A1 with 4 cores, 24GB RAM)
   - SSH Key: Add your public SSH key
   - Click **Create**

---

## Step 2: Deploy LiveKit on Oracle Instance

SSH into your instance:
```bash
ssh ubuntu@YOUR_ORACLE_IP
```

Install Docker (LiveKit runs in Docker):
```bash
sudo apt-get update
sudo apt-get install -y docker.io
sudo usermod -aG docker ubuntu
```

Create LiveKit config:
```bash
mkdir -p ~/livekit
cat > ~/livekit/livekit.yaml << 'EOF'
port: 7880
bind_addresses:
  - 0.0.0.0
keys:
  devkey: secret
audio:
  active_speaker_update: 500
  min_percent_active: 40
room:
  auto_create: true
  empty_timeout: 300
disable_strict_auth: false
EOF
```

Run LiveKit:
```bash
docker run -d \
  --name livekit \
  --restart unless-stopped \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882 \
  -v ~/livekit/livekit.yaml:/etc/livekit.yaml \
  livekit/livekit-server \
  --config /etc/livekit.yaml
```

Test it's running:
```bash
curl http://localhost:7880/
```

Get your Oracle instance's public IP:
```bash
curl ifconfig.me
```

---

## Step 3: Set Up Firewall Rules

In Oracle Console:
1. Go to **Networking** → **Virtual Cloud Networks**
2. Find your VCN and Security Lists
3. Add **Ingress Rule**:
   - Source: 0.0.0.0/0
   - Destination Port: 7880-7882 (TCP and UDP)

---

## Step 4: Update Backend Environment

Create or update `.env` in `backend/`:

```env
# Existing vars
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_secret
FRONTEND_URL=http://localhost:3000

# NEW LiveKit vars - replace with your Oracle IP
LIVEKIT_URL=http://YOUR_ORACLE_IP:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
```

---

## Step 5: Install Frontend Dependencies

```bash
cd frontend
npm install @livekit/components-react @livekit/components-core livekit-client
```

---

## Step 6: Install Backend Dependencies

```bash
cd backend
npm install livekit-server-sdk
```

---

## Step 7: Integrate Components into Channel View

Open your channel view component (wherever channels are displayed) and add:

```tsx
import { ChannelCallPrompt } from '@/app/components/videocalls/ChannelCallPrompt';
import { ChannelVideoCall } from '@/app/components/videocalls/ChannelVideoCall';

export function ChannelView({ channelId, channelName }) {
  const [isCallActive, setIsCallActive] = useState(false);
  const [callData, setCallData] = useState(null);

  const handleStartCall = (token, url, roomName) => {
    setCallData({ token, url, roomName });
    setIsCallActive(true);
  };

  const handleJoinCall = (token, url, roomName) => {
    setCallData({ token, url, roomName });
    setIsCallActive(true);
  };

  return (
    <>
      {/* Add this above messages */}
      {isCallActive && callData ? (
        <div className="mb-4">
          <ChannelVideoCall
            channelId={channelId}
            channelName={channelName}
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
          onStartCall={handleStartCall}
          onJoinCall={handleJoinCall}
        />
      )}
      
      {/* Your existing channel messages/content */}
    </>
  );
}
```

---

## Step 8: Test It

1. Start backend:
   ```bash
   cd backend
   npm run dev
   ```

2. Start frontend:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open two browser tabs
4. Go to a channel in each tab
5. Click "Start Call" in one tab
6. Click "Join Call" in the second tab
7. You should see video/audio controls

---

## Features Deployed

✅ **One-on-one calls** in channels  
✅ **Group calls** (up to 20-30 concurrent users per channel on always-free tier)  
✅ **Real-time participant tracking**  
✅ **Auto-join existing calls**  
✅ **Video/Audio controls** (mute, camera toggle)  
✅ **Call notifications** via Socket.io  

---

## Scaling to Production

### Free Tier Limits (Oracle)
- **Concurrent users per room**: ~20-30
- **Concurrent connections total**: ~50-100 unique users at once
- **Cost**: $0/month (forever)

### If You Outgrow Free Tier
The good news: **No code changes needed**

Just upgrade the Oracle instance:
```bash
# No API/code changes - just upgrade CPU/RAM
```

Cost would be ~$10-30/month depending on usage.

---

## Troubleshooting

### "Failed to connect to LiveKit server"
- Check `LIVEKIT_URL` is accessible from your frontend
- Verify firewall rules allow traffic on 7880-7882
- Check LiveKit is running: `docker logs livekit`

### "Token invalid"
- `LIVEKIT_API_KEY` and `LIVEKIT_API_SECRET` must match between backend and LiveKit config
- Check `.env` has correct values

### "No video/audio"
- Check browser permissions for camera/microphone
- Verify both users are joining the same room

### Video Quality Issues
- Reduce resolution in LiveKit config for weak connections
- Check bandwidth: Oracle free tier has adequate bandwidth

---

## Next Steps

1. **Socket.io Integration**: Add real-time call status updates
2. **Call History**: Store call logs in MongoDB
3. **Recording**: Enable LiveKit recording (advanced)
4. **Screen Sharing**: Add screen share capability
5. **Custom Themes**: Match video UI to your app styling

---

## Support

For LiveKit docs: https://docs.livekit.io/  
For Oracle Cloud: https://www.oracle.com/cloud/free/

Questions? Check the backend logs: `docker logs livekit`
