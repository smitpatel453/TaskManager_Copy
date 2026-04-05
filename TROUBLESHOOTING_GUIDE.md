# Video Calling System - Troubleshooting Guide

## Quick Diagnosis Flowchart

```
Is video calling feature working?
│
├─ NO, cannot START call
│  └─ Go to Section 1: "Start Call Issues"
│
├─ NO, can start but cannot JOIN call
│  └─ Go to Section 2: "Join Call Issues"
│
├─ NO, video/audio shows black screen or no sound
│  └─ Go to Section 3: "Video/Audio Issues"
│
├─ NO, screen share not working
│  └─ Go to Section 4: "Screen Sharing Issues"
│
├─ NO, recording not working
│  └─ Go to Section 5: "Recording Issues"
│
├─ NO, call history not appearing
│  └─ Go to Section 6: "Call History Issues"
│
├─ NO, themes not applying
│  └─ Go to Section 7: "Theme Issues"
│
└─ YES, everything working
   └─ You're all set! Check "Performance Optimization" section
```

---

## Section 1: Start Call Issues

### Error: "Cannot connect to LiveKit"

**Symptoms:**
- Button click does nothing
- Browser console shows: `Failed to create LiveKit token`
- Network tab shows 500 error on `/start-call`

**Diagnosis Steps:**

```bash
# Step 1: Check backend is running
cd backend
npm run dev

# Should show: "✅ Server running on port 5000"
```

```bash
# Step 2: Check LiveKit API responds
# Replace ORACLE_IP with your actual IP
curl http://ORACLE_IP:7880/

# Should return JSON with version info or similar
```

```bash
# Step 3: Check environment variables
cat .env | grep LIVEKIT

# Should show:
# LIVEKIT_URL=http://xxx.xxx.xxx.xxx:7880
# LIVEKIT_API_KEY=devkey
# LIVEKIT_API_SECRET=secret
```

**Solutions (Try in Order):**

1. **LiveKit Server Not Running**
   ```bash
   # In Oracle instance SSH:
   ssh -i /path/to/key ubuntu@ORACLE_IP
   
   cd ~/livekit
   docker-compose ps
   
   # If NOT running:
   docker-compose up -d
   docker-compose logs -f livekit
   # Wait 5 seconds for startup
   ```

2. **Environment Variables Wrong**
   ```bash
   # In backend/.env, verify:
   # - LIVEKIT_URL points to correct Oracle IP
   # - API KEY is "devkey" (matches livekit.yaml)
   # - API SECRET is "secret" (matches livekit.yaml)
   
   # Restart backend:
   npm run dev
   ```

3. **Firewall Rules Missing**
   ```
   In Oracle Console:
   1. Go to Compute > Instances
   2. Click your instance name
   3. Click VCN link
   4. Click "Security Lists"
   5. Click "Default Security List"
   6. Verify these rules exist:
      - TCP 7880 (HTTP)
      - TCP 7881-7882
      - UDP 7882
      
   If missing, click "Add Ingress Rules" and add them
   ```

4. **Network Timeout**
   ```bash
   # Test from local machine:
   # Replace ORACLE_IP
   
   # Test latency:
   ping ORACLE_IP
   
   # If timeout, check:
   - Oracle instance is running
   - Security group allows ICMP (if not, just try next step)
   - Firewall on your internet allows port 7880
   
   # Direct test:
   curl -v http://ORACLE_IP:7880/
   # Should see "Connected to ORACLE_IP"
   ```

### Error: "Call already exists"

**Symptoms:**
- Can start one call
- Try to start again, get error message

**Solution:**
```
This is a safety feature. To start a new call:
1. Click "End Call" button to end the active call
2. Wait 5 seconds for MongoDB to update
3. Try starting a new call

If stuck:
1. Manually delete the call in MongoDB:
   db.channels.updateOne(
     { _id: ObjectId("channel_id") },
     { $set: { activeCall: null } }
   )
2. Refresh browser
3. Try again
```

### Error: "Invalid permissions"

**Symptoms:**
- See in browser console: `Unauthorized`
- Network tab shows 401 error

**Solution:**
```
1. Check you're logged in (see login form)
2. If logged in, check JWT token:
   - Open DevTools (F12)
   - Application > Cookies
   - Check "auth-token" exists
   
3. If token missing, logout and login again:
   - Click profile menu > Logout
   - Login with valid credentials
   - Try call again

4. If still fails:
   - Clear cookies: Ctrl+Shift+Delete
   - Close browser completely
   - Reopen and login
```

---

## Section 2: Join Call Issues

### Error: "No active call found"

**Symptoms:**
- "Join Call" button doesn't appear
- Or shows "No active call" message

**Diagnosis:**

```bash
# Step 1: Check if someone started a call
# Make sure another user (in another browser) has started the call
# The call must be in the same channel

# Step 2: Check call status on backend
cd backend
# Look in logs for:
# "channel:call-started" event
# This indicates a call exists
```

**Solutions:**

1. **Call Not Started Yet**
   ```
   Ask the other user to click "Start Call" first
   Then refresh your page or wait 5 seconds
   "Join Call" button should appear
   ```

2. **Call is in Different Channel**
   ```
   Make sure both users are in the SAME channel
   
   Example: If User A starts call in #general
   User B must also open #general to see the call
   ```

3. **Call Expired**
   ```
   Calls auto-close after 5 minutes of inactivity
   Solution: Ask User A to start a new call
   ```

4. **Page Cache Issue**
   ```
   Hard refresh the page:
   - Windows: Ctrl+Shift+R
   - Mac: Cmd+Shift+R
   
   Then try joining again
   ```

### Error: "Failed to join room"

**Symptoms:**
- "Join Call" button exists
- Click it, see "Failed to join room" error
- You see the other user's video briefly then it stops

**Diagnosis:**

```bash
# Check backend logs:
cd backend
npm run dev | grep -i "error\|failed"

# Check LiveKit logs:
ssh -i key ubuntu@ORACLE_IP
cd ~/livekit
docker-compose logs livekit | tail -50
```

**Solutions:**

1. **Too Many Participants**
   ```
   Current active limit per room: 50 users
   
   If more trying to join:
   - Try a different channel for overflow
   - Upgrade Oracle instance (see scaling section)
   - Or use multiple rooms for large groups
   ```

2. **LiveKit Room Crashed**
   ```
   Solution:
   1. Original call starter should click "End Call"
   2. Wait 10 seconds
   3. All users refresh page
   4. Start new call
   ```

3. **Network Issue**
   ```
   Check:
   - Internet connection: Open google.com
   - Firewall: Ports 7880-7882 allowed outbound
   - Proxy: Check if corporate proxy blocking WebRTC
   
   Try:
   - Switch to mobile hotspot to test
   - Use VPN if corporate firewall blocks
   - Restart router/modem
   ```

---

## Section 3: Video/Audio Issues

### Symptom: "Black screen - no video from other user"

**Diagnosis:**

```bash
# Open browser DevTools:
# F12 > Console tab

# You should see:
# "URL ws://xxx:7880/ws" (WebSocket connected)
# No red error messages

# If you see errors like:
# "Failed to set remote description"
# "ICE connection failed"
# Go to next solution
```

**Solutions (Try in Order):**

1. **Grant Camera/Microphone Permissions**
   ```
   1. Click address bar (left of URL in browser)
   2. Find camera icon or security icon
   3. Click "Reset" to clear permissions
   4. Refresh page
   5. Browser will ask permission - click "Allow"
   6. Video should appear
   ```

2. **Restart Video Stream**
   ```
   1. Click "Leave" button
   2. Wait 3 seconds
   3. Click "Join Call" again
   4. If still black, proceed to next solution
   ```

3. **WebRTC Connection Failed**
   ```
   This usually means networking issue:
   
   # Check:
   1. Both users have good internet (>5 Mbps)
   2. Not on corporate network blocking UDP ports
   3. No VPN/proxy issues
   
   # Test:
   Open https://webrtc.github.io/samples/
   Click "Stream - Get Display Media"
   If this fails, WebRTC is blocked on your network
   
   # Solutions:
   - Switch to mobile hotspot to test
   - Ask IT to unblock UDP 7880-7882
   - Use VPN that supports WebRTC
   ```

4. **Camera in Use by Another App**
   ```
   # Check what's using camera:
   # Windows:
   Settings > Privacy > Camera
   See which apps have camera access
   Close the other app
   
   # Close all:
   Zoom, Teams, Skype, Discord, etc.
   Then try video call again
   ```

### Symptom: "No audio - video works, but can't hear other person"

**Diagnosis:**

```bash
# Step 1: Check microphone working in other app
1. Open Google Meet or Zoom
2. Test microphone
3. If fails there too, hardware issue

# Step 2: Check volume settings
1. Right-click speaker icon (taskbar)
2. Open Volume mixer
3. Ensure volume is up for browser
4. Ensure browser isn't muted (check tab icon)
```

**Solutions:**

1. **Browser Microphone Permission**
   ```
   Same as video permissions above:
   1. Click camera/security icon in address bar
   2. Reset permissions
   3. Allow microphone access
   4. Refresh page
   ```

2. **Volume Too Low**
   ```
   1. Windows: Right-click speaker > Volume mixer
   2. Find Chrome/Edge/Firefox
   3. Drag volume slider right (to 100%)
   4. Try call again
   ```

3. **Wrong Microphone Selected**
   ```
   1. Go to browser settings
   2. Privacy and security > Camera and microphone
   3. For "Microphone" dropdown, select correct device
   (e.g., if using USB headset, select that)
   4. Refresh call page
   ```

4. **Echo Issues**
   ```
   If other person says they hear echo:
   1. Mute your microphone in the call
   2. Have other person unmute and check if echo gone
   3. If echo stops, you have echo - check:
       - Are speakers playing audio while recording? **Mute browser window audio first before speaking**
       - Microphone too close to speaker
       - Feedback loop from open meeting in another tab
   ```

---

## Section 4: Screen Sharing Issues

### Error: "Share Screen button does nothing"

**Symptoms:**
- Click "Share Screen" button
- Nothing happens
- No error message

**Diagnosis:**

```bash
# Check if HTTPS or localhost:
# Screen sharing ONLY works in:
# 1. localhost:3000 (development)
# 2. https:// (production)
# 
# It does NOT work with http:// on production domain

# Current setup: Should work (localhost:3000)
```

**Solutions:**

1. **Browser Doesn't Support Screen Share**
   ```
   Screen sharing requires:
   - Chrome/Edge (all versions)
   - Firefox (recent versions)
   - Safari (12+)
   
   Try: Different browser to test
   If works in Chrome but not Firefox, that's expected
   (Firefox requires different permissions flow)
   ```

2. **Permission Denied**
   ```
   When screen share asks permission:
   - Click "Share" or "Allow"
   - Choose which monitor to share (if multiple screens)
   
   If dismissed:
   - Try screen share again
   - Grant permission when prompt appears
   ```

3. **On HTTPS Production**
   ```bash
   # Screen sharing on HTTPS requires valid SSL certificate
   # Self-signed certs don't work
   
   # Get free SSL from Let's Encrypt:
   # (Separate guide, but generally done via hosting provider)
   ```

### Symptom: "Screen share frozen or lagging"

**Solutions:**

1. **Too Much Network Bandwidth**
   ```
   Screen share is high-bandwidth
   
   Check:
   - Download speed: speedtest.net
   - Should be >10 Mbps for good screen share
   
   If low:
   - Close other downloads
   - Use 5G if available
   - Reduce resolution (settings on screen share UI)
   ```

2. **Reduce Screen Share Quality**
   ```
   In the call UI:
   - Look for screen share settings button
   - Set to "Medium" or "Low" quality
   - Reduces bandwidth
   ```

3. **CPU Too High**
   ```
   Screen sharing uses CPU encoding
   
   Check:
   - Task Manager > Performance
   - If CPU >80%, close other apps
   - Browser will auto-reduce quality to ease load
   ```

---

## Section 5: Recording Issues

### Symptom: "Recording checkbox doesn't work"

**Solutions:**

1. **Check Recording Checkbox Before Starting**
   ```
   Recording is set at call START time
   
   Correct flow:
   1. See "Start Call" button
   2. Check the "Enable Recording" checkbox
   3. THEN click "Start Call"
   
   Wrong flow:
   1. Click "Start Call"
   2. Try to enable recording after
   (Won't work - set before starting)
   ```

2. **Recording Enabled But Not Saving**
   ```
   By default, recordings are stored as metadata only
   (Not actual video files)
   
   To enable actual video recording:
   1. Configure storage backend (S3, Azure, etc)
   2. Update backend recording handler
   3. Restart backend
   
   For now, flag is stored but not video file
   ```

### Error: "Recording failed to save"

**Diagnosis:**

```bash
# Check backend logs:
cd backend
npm run dev | grep -i record

# Should show: "Recording enabled at <timestamp>"

# If error, check:
# 1. Storage backend configured
# 2. Permissions correct
# 3. Disk space available
```

**Solutions:**

1. **Storage Not Configured**
   ```
   Currently recordings are metadata-only
   
   To save actual videos:
   
   # Option A: Local storage
   mkdir -p ~/livekit/recordings
   # Update docker-compose to mount folder
   
   # Option B: S3 storage
   # Add AWS keys to .env
   # Update recording service to use S3 SDK
   
   # Option C: Azure storage
   # Add Azure connection string to .env
   # Update recording service to use Azure SDK
   ```

2. **Insufficient Disk Space**
   ```bash
   # Check disk space:
   ssh ubuntu@ORACLE_IP
   df -h
   
   # If /dev/root <10% free:
   # Need to delete old recordings or upgrade
   
   # Clean recordings:
   sudo rm -rf ~/livekit/recordings/*
   sudo rm -rf /var/log/*
   ```

---

## Section 6: Call History Issues

### Symptom: "Call history shows empty"

**Diagnosis:**

```bash
# Check if calls are being saved to MongoDB:
# 1. Make a test call (start and end)
# 2. Check MongoDB directly

mongo
use taskmanager
db.callhistories.countDocuments()
# Should return count > 0 if calls saved

# If 0, go to solutions below
```

**Solutions:**

1. **MongoDB Connection Issue**
   ```bash
   # In backend logs, check for:
   cd backend
   npm run dev | grep -i mongodb
   
   # Should show:
   # "✅ Connected to MongoDB"
   
   # If not, check .env:
   cat .env | grep MONGODB
   
   # MONGODB_URI must be valid connection string
   ```

2. **Database Permissions**
   ```
   If using MongoDB Atlas:
   1. Check IP whitelist includes your server
   2. Check user has write permissions
   3. Test connection with MongoDB Compass
   ```

3. **Model Not Initialized**
   ```bash
   # Verify callHistory model is imported:
   grep -r "callHistoryModel" backend/src/
   
   # Should show in:
   - controllers/videocalls.controller.ts
   - models/callHistory.model.ts
   
   If missing, restart backend:
   npm run dev
   ```

4. **Frontend Cache**
   ```
   Hard refresh call history page:
   - Ctrl+Shift+R (Windows)
   - Cmd+Shift+R (Mac)
   
   Give it 10 seconds to load
   ```

### Symptom: "Call history takes forever to load"

**Solutions:**

1. **Many Calls in Database**
   ```
   First page load scans all calls
   
   If 100,000+ calls, add database index:
   
   db.callhistories.createIndex({ channelId: 1, startedAt: -1 })
   
   After index created, queries will be instant
   ```

2. **Network Too Slow**
   ```
   Check internet speed:
   speedtest.net
   
   Should be >5 Mbps
   If slower, that's probably the bottleneck
   ```

3. **Database Too Far**
   ```
   If database in different region:
   - Try on localhost
   - Or move DB to same region as app
   ```

---

## Section 7: Theme Issues

### Symptom: "Dark theme not applying"

**Solutions:**

1. **CSS Variables Not Defined**
   ```
   Components need CSS variables defined
   
   In your app's global.css, add:
   
   :root {
     --bg-surface-1: #1a1a1a;
     --bg-surface-2: #2d2d2d;
     --text-primary: #ffffff;
     --text-secondary: #b0b0b0;
     --accent: #007bff;
     --border-subtle: #444444;
   }
   
   @media (prefers-color-scheme: light) {
     :root {
       --bg-surface-1: #ffffff;
       --bg-surface-2: #f5f5f5;
       --text-primary: #000000;
       --text-secondary: #666666;
       --accent: #0056b3;
       --border-subtle: #dddddd;
     }
   }
   ```

2. **Theme Prop Not Passed**
   ```
   Make sure component has theme prop:
   
   <ChannelVideoCall
     channelId="general"
     theme="dark"    <-- This is required
   />
   ```

3. **Browser Cache**
   ```
   Hard refresh:
   Ctrl+Shift+R (Windows)
   Cmd+Shift+R (Mac)
   
   This clears CSS cache
   ```

### Symptom: "Light theme too bright/hard to read"

**Solutions:**

1. **Adjust CSS Variables**
   ```
   Edit your global.css light theme:
   
   @media (prefers-color-scheme: light) {
     :root {
       --bg-surface-1: #f0f0f0;  /* darker white */
       --bg-surface-2: #e0e0e0;  /* darker gray */
       --text-primary: #1a1a1a;  /* darker black */
     }
   }
   ```

2. **Use System Preference**
   ```typescript
   // Detect system theme:
   const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
   
   <ChannelVideoCall theme={isDark ? 'dark' : 'light'} />
   ```

---

## Performance Optimization

### If Video Calling is Slow

1. **Reduce Resolution**
   ```
   In ChannelVideoCall component:
   Look for video quality settings
   Set to "medium" or "low"
   ```

2. **Reduce Frame Rate**
   ```
   In LiveKit rooms: Default is 30 FPS
   Can reduce to 15 FPS to save bandwidth
   ```

3. **Close Unused Tabs**
   ```
   Each browser tab uses RAM
   Close other tabs to free up resources
   ```

4. **Check System Resources**
   ```
   Windows:
   Ctrl+Shift+Esc > Performance
   
   Check:
   - CPU < 80%
   - RAM < 80%
   - Network <50 Mbps
   ```

### If Call Quality Degrades Over Time

1. **Restart Browser**
   ```
   Close all browser windows
   Hard restart browser
   Reopen call
```

2. **Check for Memory Leaks**
   ```bash
   # In browser DevTools:
   # Performance > Record > Do call for 5 mins > Stop
   # Check memory graph - should stay flat
   # If climbing only, restart browser
   ```

3. **Update Docker**
   ```bash
   # In Oracle instance:
   docker-compose pull
   docker-compose up -d
   # Restarts with latest LiveKit version
   ```

---

## Monitoring Checklist

### Daily
- ✅ Check backend logs for errors
- ✅ Test one call end-to-end
- ✅ Monitor Oracle instance CPU/RAM

### Weekly
- ✅ Check call history growth (size)
- ✅ Review any failed calls
- ✅ Monitor database performance

### Monthly
- ✅ Archive old call history (>30 days)
- ✅ Update LiveKit docker image
- ✅ Review Oracle billing (should be $0)
- ✅ Backup MongoDB

---

## When All Else Fails

### System Reset

```bash
# 1. Restart Backend
cd backend
# Ctrl+C to stop
npm run dev

# 2. Restart Frontend
cd frontend
# Ctrl+C to stop
npm run dev

# 3. Restart LiveKit
ssh ubuntu@ORACLE_IP
cd ~/livekit
docker-compose restart livekit

# 4. Clear Browser Cache
Ctrl+Shift+Delete > All time > Clear

# 5. Hard refresh
Ctrl+Shift+R

# 6. Try again
```

### Full Database Reset (Last Resort)

```bash
# WARNING: This deletes all calls!
# Only do if corrupted

db.callhistories.deleteMany({})

# Recreate indexes:
docker-compose exec mongodb mongosh
use taskmanager
db.callhistories.createIndex({ channelId: 1, startedAt: -1 })
db.callhistories.createIndex({ initiatorId: 1 })
db.callhistories.createIndex({ participantIds: 1 })
db.callhistories.createIndex({ createdAt: -1 })
```

---

## Getting Help

### Best Debug Information to Share

```
1. Error message (exact text)
2. Browser console errors (F12 > Console)
3. Backend logs (npm run dev output)
4. Network errors (F12 > Network tab)
5. Your setup: 
   - Where LiveKit running (localhost or Oracle)
   - How many users testing
   - What actions before error
```

### Check These First

1. Is backend running? `npm run dev` in backend folder
2. Is frontend running? `npm run dev` in frontend folder  
3. Is LiveKit running? `docker-compose ps`
4. Are you logged in? Check if user menu shows your name
5. Are you in a channel? Check if channel name shows at top

---

Last Updated: 2024
For other issues, check ADVANCED_FEATURES_GUIDE.md or IMPLEMENTATION_SUMMARY.md
