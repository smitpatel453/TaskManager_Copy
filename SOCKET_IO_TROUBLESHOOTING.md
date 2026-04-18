# Socket.IO Connection Troubleshooting Guide

## Issue: WebSocket Connection Errors

If you see errors like:
```
⚠️ Socket connection error: "websocket error"
   Message: Unknown error
   Transport: websocket
```

## Quick Fix Checklist

### 1. **Backend Server Not Running** ✅
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Should see:
# [Socket.IO] 🚀 Initializing Socket.IO server...
# [Socket.IO] ✅ Transports enabled: websocket, polling
# 🌐 Server running on port 3001
```

### 2. **API URL Configuration** ✅

Create `.env.local` in the **frontend** folder:
```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Or for production:
```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.com
```

### 3. **Backend CORS Configuration** ✅

Check `backend/src/middlewares/cors.ts`:
```typescript
export const CORS_CONFIG = {
  origin: [
    'http://localhost:3000',      // ← Frontend URL
    'http://127.0.0.1:3000',
    'http://192.168.1.6:3000',
    // Add your deployment URLs
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
};
```

**Make sure your frontend URL is in the CORS whitelist!**

### 4. **Authentication Token** ✅

Socket requires an auth token. Check browser console:
```javascript
// Open browser console and run:
localStorage.getItem('token')

// Should return: "eyJhbGciOiJIUzI1NiIs..." (not null or empty)
```

If token is missing:
- [ ] Login again
- [ ] Check that localStorage is enabled
- [ ] Clear browser cache and login

---

## Step-by-Step Debugging

### Step 1: Check Backend is Running
```bash
curl http://localhost:3001/health
# Should return: { "status": "ok" }
```

### Step 2: Test Socket Connection
Open browser console and run:
```javascript
const socket = io('http://localhost:3001', {
  auth: {
    token: localStorage.getItem('token')
  }
});

socket.on('connect', () => {
  console.log('✅ Connected!');
});

socket.on('connect_error', (error) => {
  console.error('❌ Error:', error);
});
```

### Step 3: Check Network Tab
1. Open DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. You should see:
   - `localhost:3001` → Status: `101 Switching Protocols`
   - If you see `400`, `403`, or `401` → Auth error

### Step 4: Check Backend Logs
Backend should show:
```
🔌 Client connected: abc123def456
   📡 Transport: websocket
   👤 User ID: user-id-here
```

---

## Common Issues & Solutions

### ❌ Error: `ERR_INVALID_URL`
**Cause**: API URL not configured

**Solution**:
```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Then restart frontend:
```bash
npm run dev
```

---

### ❌ Error: `websocket error` 
**Cause**: Backend not running or unreachable

**Solution**:
```bash
# Check if backend is running
lsof -i :3001
# If nothing shows, start backend:
cd backend && npm run dev
```

---

### ❌ Error: `CORS policy blocked`
**Cause**: Frontend URL not in CORS whitelist

**Solution**: Update `backend/src/middlewares/cors.ts`:
```typescript
export const CORS_CONFIG = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    // Add this line:
    'http://your-frontend-url:port'
  ],
```

Then restart backend.

---

### ❌ Error: `Unauthorized`
**Cause**: No auth token or invalid token

**Solution**:
1. Check browser console:
   ```javascript
   localStorage.getItem('token')
   ```
2. If empty, login again
3. If you see a token, check it's not expired:
   ```javascript
   const token = localStorage.getItem('token');
   const decoded = JSON.parse(atob(token.split('.')[1]));
   console.log(decoded.exp * 1000 > Date.now() ? 'Valid' : 'Expired');
   ```

---

### ❌ Error: `connection timeout`
**Cause**: Firewall blocking WebSocket, or server too slow

**Solution**:
- Check firewall settings for port 3001
- Increase timeout in socket config:
  ```typescript
  // frontend/app/providers/SocketProvider.tsx
  reconnectionDelay: 2000,        // ← Increase this
  reconnectionDelayMax: 10000,    // ← And this
  ```

---

## Production Deployment

### For Vercel (Frontend)
```env
# frontend/.env.local or Vercel env vars
NEXT_PUBLIC_API_URL=https://your-backend.com
```

### For Backend Deployment
```typescript
// backend/src/middlewares/cors.ts
export const CORS_CONFIG = {
  origin: [
    'http://localhost:3000',                    // Development
    'https://your-frontend.vercel.app',         // Production frontend
    'https://your-domain.com',                  // Custom domain
  ],
```

### Socket.IO Configuration for Production
```typescript
// backend/src/infrastructure/socket.ts
const io = new SocketIOServer(httpServer, {
  cors: CORS_CONFIG,
  transports: ['websocket', 'polling'],  // ← Both enabled
  
  // Production settings
  pingInterval: 25000,
  pingTimeout: 60000,
  
  // For serverless (Vercel, AWS Lambda)
  allowEIO3: true,  // ← Add this
});
```

---

## Monitoring & Debugging

### Enable Debug Logs (Development Only)
```javascript
// In browser console
localStorage.setItem('debug', 'socket.io-client');
// Then refresh the page
```

### Monitor Real-Time Connections
```bash
# In backend terminal, add this to socket.ts
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  console.log(`   Total clients: ${io.engine.clientsCount}`);
  
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
    console.log(`   Total clients: ${io.engine.clientsCount}`);
  });
});
```

---

## Performance Optimization

### Reduce Polling Overhead
```typescript
// For users on slow networks
const isSlowNetwork = navigator.connection?.effectiveType === 'slow-2g' || '3g';

const socketConfig = {
  transports: isSlowNetwork ? ['polling'] : ['websocket', 'polling'],
  pollingInterval: isSlowNetwork ? 5000 : 3000,  // Poll less frequently on slow networks
};
```

### Increase Buffer Sizes (Large Files/Messages)
```typescript
// backend/src/infrastructure/socket.ts
io = new SocketIOServer(httpServer, {
  maxHttpBufferSize: 1e7,  // ← 10MB instead of 1MB
});
```

---

## Testing Socket Connection

### Unit Test Example
```typescript
import { io } from 'socket.io-client';

describe('Socket Connection', () => {
  it('should connect to socket server', (done) => {
    const socket = io('http://localhost:3001', {
      auth: { token: process.env.TEST_TOKEN }
    });

    socket.on('connect', () => {
      expect(socket.connected).toBe(true);
      socket.disconnect();
      done();
    });

    socket.on('connect_error', (error) => {
      done(error);
    });
  });
});
```

---

## Help & Support

If issues persist:
1. Check backend logs: `tail -f backend/logs/*.log`
2. Check browser Network tab in DevTools
3. Run: `curl -v http://localhost:3001/socket.io/?EIO=4&transport=polling`
4. Share the full error message and both browser + backend logs

