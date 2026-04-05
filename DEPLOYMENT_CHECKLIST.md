# Quick Start Deployment Checklist

## Pre-Deployment Verification (Do This First)

### ✅ Backend Setup
```bash
cd backend
npm install

# Verify LiveKit dependencies installed
npm list livekit-server-sdk @types/node

# Check environment variables
cat .env
# Should contain:
# LIVEKIT_URL=http://your-oracle-ip:7880
# LIVEKIT_API_KEY=devkey
# LIVEKIT_API_SECRET=secret
```

### ✅ Frontend Setup
```bash
cd frontend
npm install

# Verify LiveKit components installed
npm list @livekit/components-react @livekit/components-core livekit-client

# Check Socket.io client
npm list socket.io-client
```

### ✅ Database Setup
```bash
# Verify MongoDB connection in backend .env
# MONGODB_URI=mongodb+srv://...

# Test connection (optional)
# Run backend and check console for "Connected to MongoDB"
```

---

## Step 1: Deploy LiveKit on Oracle Cloud

### 1.1 Create Oracle Account (If Not Already Done)
- ✅ Go to https://www.oracle.com/cloud/free/
- ✅ Sign up with your debit/credit card
- ✅ Complete email verification
- ✅ Go to Oracle Cloud Console

### 1.2 Create Ubuntu Instance
- ✅ Click **"Create VM instance"**
- ✅ Name: `livekit-server`
- ✅ Image: **Ubuntu 22.04 (Minimal)** - ARM compatible
- ✅ Shape: **Ampere (ARM)** - 4 OCPUs, 24GB memory
- ✅ Boot Volume: 50GB
- ✅ Virtual Cloud Network: Create new (default)
- ✅ Subnet: Create new (default)
- ✅ Public IP: Check "Assign a public IPv4 address"
- ✅ SSH Key: Download and save locally (YOU NEED THIS)
- ✅ Click **"Create"** and wait 3-5 minutes

### 1.3 Connect to Instance
```bash
# Find your instance's Public IP in Oracle Console
# Replace with your actual IP:
IP_ADDRESS=xxx.xxx.xxx.xxx

# SSH into instance (Windows: use PowerShell)
ssh -i /path/to/private-key ubuntu@$IP_ADDRESS

# You should see: ubuntu@livekit-server:~$
```

### 1.4 Install Docker
```bash
# Inside the instance SSH session:
sudo apt update
sudo apt install -y docker.io docker-compose

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Exit and reconnect for group changes to take effect
exit

# Reconnect:
ssh -i /path/to/private-key ubuntu@$IP_ADDRESS

# Verify Docker works
docker --version
```

### 1.5 Deploy LiveKit with Docker
```bash
# Still in instance SSH session:
mkdir -p ~/livekit && cd ~/livekit

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  livekit:
    image: livekit/livekit-server:latest
    command: --dev --config livekit.yaml
    volumes:
      - ./livekit.yaml:/etc/livekit.yaml
    ports:
      - "7880:7880"
      - "7881:7881"
      - "7882:7882/udp"
    environment:
      - LIVEKIT_API_KEY=devkey
      - LIVEKIT_API_SECRET=secret
    restart: unless-stopped
EOF

# Create livekit.yaml config
cat > livekit.yaml << 'EOF'
port: 7880
bind_addresses:
  - "0.0.0.0"
room:
  auto_create: true
  empty_timeout: 300
webhooks:
  api_key: devkey
keys:
  devkey: secret
logging:
  level: info
  sample: false
EOF

# Start LiveKit
docker-compose up -d

# Check if running
docker-compose ps
# Should show "livekit-livekit-1" as "Up"

# View logs
docker-compose logs -f livekit
# Press Ctrl+C to exit logs
```

### 1.6 Configure Firewall (Critical!)
```bash
# In Oracle Console:
# 1. Go to Compute > Instances
# 2. Click your livekit-server instance
# 3. Click the VCN (Virtual Cloud Network) link
# 4. Click "Security Lists" (left sidebar)
# 5. Click "Default Security List"
# 6. Click "Add Ingress Rules"

# Add these rules:
# Rule 1: TCP port 7880 (HTTP)
#   Protocol: TCP
#   Source: 0.0.0.0/0
#   Destination Port: 7880

# Rule 2: TCP ports 7881-7882
#   Protocol: TCP
#   Source: 0.0.0.0/0
#   Destination Port Range: 7881-7882

# Rule 3: UDP port 7882
#   Protocol: UDP
#   Source: 0.0.0.0/0
#   Destination Port: 7882

# Click "Add Ingress Rules"
```

### 1.7 Test LiveKit Connectivity
```bash
# In your local machine (NOT in SSH):
ORACLE_IP=xxx.xxx.xxx.xxx

# Test HTTP connection
curl http://$ORACLE_IP:7880/

# Should return: "livekit-server" with version info
# OR you'll see it in the response JSON

# If you see a response, LiveKit is running!
```

---

## Step 2: Update Backend Configuration

### 2.1 Update .env File
```bash
# In backend/.env, update:
LIVEKIT_URL=http://xxx.xxx.xxx.xxx:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# Example:
# LIVEKIT_URL=http://130.61.152.42:7880
# LIVEKIT_API_KEY=devkey
# LIVEKIT_API_SECRET=secret
```

### 2.2 Start Backend
```bash
cd backend
npm run dev

# You should see:
# ✅ Server running on port 5000
# ✅ Connected to MongoDB
# ✅ LiveKit configured: http://xxx.xxx.xxx.xxx:7880
```

---

## Step 3: Start Frontend

### 3.1 In New Terminal
```bash
cd frontend
npm run dev

# You should see:
# ▲ Next.js 16.x.x
# - Local: http://localhost:3000
```

---

## Step 4: Test Video Calling

### 4.1 Open Two Browser Windows

**Window 1:**
- Go to `http://localhost:3000`
- Login as User A
- Go to a channel (e.g., "general")
- Click **"Start Call"** button

**Window 2:**
- Open new incognito/private window
- Go to `http://localhost:3000`
- Login as User B
- Go to same channel
- Click **"Join Call"** button

### 4.2 Test Features
- ✅ Both users see each other's video
- ✅ Duration timer starts and increments
- ✅ **Share Screen** button works (click to toggle)
- ✅ **Record** button enables recording indicator
- ✅ Click **Leave** to disconnect

### 4.3 Verify in Backend Logs
- ✅ See "channel:call-started" event
- ✅ See "channel:call-user-joined" event
- ✅ See "channel:call-ended" event with duration

---

## Step 5: Verify Call History

### 5.1 Check MongoDB
```bash
# In backend directory:
# Option 1: MongoDB Compass (GUI)
# Connect to: mongodb+srv://...
# Database: "taskmanager" or your DB name
# Collection: "callhistories"
# You should see your test call recorded

# Option 2: Command line (if using local MongoDB)
mongo
> use taskmanager
> db.callhistories.find().pretty()
# Shows all calls
```

### 5.2 Check Call History in UI
- ✅ After call ends, wait 5 seconds
- ✅ Scroll down to "Call History" section
- ✅ You should see your test call listed
- ✅ Shows: initiator, date, participants, duration

---

## Step 6: Enable Recording (Optional)

### 6.1 Update Backend to Store Recordings
The recording flag is already enabled in the code. To actually store video files:

**Option A: Local Storage (Development)**
```bash
# Inside Oracle instance SSH:
mkdir -p ~/livekit/recordings

# Update docker-compose.yml to mount recordings directory
# Add under volumes:
#   - ./recordings:/etc/livekit/recordings
```

**Option B: Cloud Storage (Production - Choose One)**

**Azure Blob Storage:**
```
1. Create Azure storage account
2. Add connection string to backend .env:
   AZURE_STORAGE_CONNECTION_STRING=...
   RECORDING_STORAGE_TYPE=azure
```

**AWS S3:**
```
1. Create S3 bucket
2. Add AWS credentials to backend .env:
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_S3_BUCKET=...
   RECORDING_STORAGE_TYPE=s3
```

### 6.2 Test Recording
- ✅ Start a call
- ✅ Check the **"Record"** checkbox
- ✅ Indicator shows "REC" in red
- ✅ End call and check call history
- ✅ Recording URL should be populated

---

## Monitoring & Troubleshooting

### Check LiveKit Health
```bash
# In Oracle instance SSH:
docker-compose logs livekit | tail -20

# Should show:
# "listening on :7880"
# "listening on :7881"
# "listening on :7882/udp"
```

### Check Backend Health
```bash
cd backend
npm run dev

# Should show no errors
# Example log output:
# ✅ Server running on port 5000
# ✅ Connected to MongoDB
# ✅ LiveKit configured
```

### Common Issues

**Issue: "Cannot connect to LiveKit"**
```
Solution:
1. Check Oracle instance is running: AWS Console > Instances
2. Check firewall rules: 7880, 7881, 7882 are open
3. Verify docker-compose is running: docker-compose ps
4. Test connectivity: curl http://ORACLE_IP:7880
```

**Issue: "Video not showing in browser"**
```
Solution:
1. Check browser permissions: Allow camera/microphone
2. Ensure both users are in SAME channel
3. Check console for WebRTC errors (F12 > Console)
4. Verify backend received call-start event
```

**Issue: "Call history not saving"**
```
Solution:
1. Check MongoDB connection in backend logs
2. Verify callHistories collection exists
3. Check user has correct permissions in MongoDB
4. Try restarting backend: npm run dev
```

**Issue: "Recording not starting"**
```
Solution:
1. Ensure recordingEnabled=true is passed
2. Check LiveKit has write permissions to storage folder
3. Verify LIVEKIT_API_KEY and LIVEKIT_API_SECRET match
4. Check LiveKit logs: docker-compose logs livekit
```

---

## Performance Metrics

### Expected Performance
- **Connection Time:** 1-2 seconds
- **Video Latency:** 100-300ms (peer-to-peer), 300-800ms (relay)
- **Maximum Rooms:** Unlimited (Oracle tier-dependent)
- **Users per Room:** 30-50 (Oracle Always Free)
- **Database Query:** <100ms for call history

### Optimization Tips
1. **Connection:** Use same region as users
2. **Video:** Enable VP9 codec for better compression
3. **Database:** Index queries on `channelId` and `createdAt`
4. **RAM:** Monitor with `free -h` in Oracle instance

---

## Scaling Path

### Current Setup (Oracle Always Free)
- ✅ 4 CPU cores, 24GB RAM
- ✅ Supports 30-50 concurrent users
- ✅ Cost: **$0/month** (forever)

### Scale Up Option 1 (More CPU)
- VM.Standard.A1.Flex: 2-80 CPU cores, 12-480GB RAM
- Cost: ~$0.03 per OCPU/hour ($20-80/month)

### Scale Up Option 2 (Cluster)
- Run multiple LiveKit instances behind load balancer
- Cost: Proportional to instances

### Scale Up Option 3 (Managed Service)
- Switch to Agora, Twilio, or managed LiveKit
- Cost: Usually ~$0.01/min for video

---

## Backup & Maintenance

### Daily Backup
```bash
# Backup MongoDB (your DB provider handles this)
# Most MongoDB Atlas does automatic backups

# Backup application code
git push origin main
```

### Weekly Maintenance
```bash
# Check LiveKit logs for errors
docker logs livekit | grep ERROR

# Check disk space
df -h

# Check memory usage
free -h
```

### Monthly Tasks
- Review call history statistics
- Archive old recordings
- Update Docker images: `docker-compose pull && docker-compose up -d`
- Check Oracle billing (should be $0)

---

## Summary

✅ **Just completed:**
1. Socket.io real-time call events
2. Call history saved to MongoDB
3. Recording flagging system
4. Screen sharing UI
5. Custom themes (dark/light)

✅ **Next immediate steps:**
1. Deploy LiveKit on Oracle Cloud (15 mins)
2. Update backend .env with LiveKit URL
3. Test with two browser windows
4. Verify call history in MongoDB

✅ **You're ready to:**
- Make group video calls
- Track all calls in history
- Record conversations
- Share screens
- Switch themes

**Need help?** Check the logs:
- Backend: `npm run dev` → look for errors
- Frontend: F12 → Console → look for errors
- LiveKit: `docker-compose logs livekit`

**Time estimate:** 30 minutes total from now to fully working system

---

Generated: 2024
For support, check IMPLEMENTATION_SUMMARY.md and ADVANCED_FEATURES_GUIDE.md
