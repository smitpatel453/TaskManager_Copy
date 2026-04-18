# Environment Setup Guide

## Quick Start - First Time Setup

### 1. Backend Setup

```bash
cd backend

# Copy environment template
cp .env.example .env

# Edit .env with your values
# nano .env
```

**Essential Values for Development:**
```env
MONGODB_URI=mongodb://localhost:27017/task-manager
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
JWT_SECRET=dev-secret-key-change-in-production
```

**Verify MongoDB is running:**
```bash
# On Windows (MongoDB Community)
mongod

# On macOS with Homebrew
brew services start mongodb-community

# On Linux
sudo systemctl start mongod
```

**Start the backend:**
```bash
npm run dev
# Should output:
# 🌐 Server running on port 3001
# 🔌 Socket.IO server initialized
```

---

### 2. Frontend Setup

```bash
cd frontend

# Copy environment template
cp .env.example .env.local

# Edit .env.local
# nano .env.local
```

**Default Values (for local development):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Start the frontend:**
```bash
npm run dev
# Should output:
# ▲ Next.js 16.1.6
# 📖 Application ready on http://localhost:3000
```

---

## Environment Variables Reference

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API URL (must be public) |
| `NEXT_PUBLIC_ANALYTICS_ID` | (optional) | Analytics service ID |
| `NEXT_PUBLIC_ENABLE_BETA_FEATURES` | `false` | Enable experimental features |

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://localhost:27017/task-manager` | MongoDB connection string |
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `development` | Environment (development/production) |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend URL for CORS |
| `JWT_SECRET` | (required) | Secret key for JWT tokens |
| `SOCKET_IO_TRANSPORTS` | `websocket,polling` | Socket.IO transports |

---

## Development Setup (macOS/Linux)

### Prerequisites
- Node.js 18+ ([Download](https://nodejs.org))
- MongoDB 5+ ([Download](https://www.mongodb.com/try/download/community))
- pnpm or npm ([pnpm setup](https://pnpm.io/installation))

### Installation

```bash
# Clone the repo
git clone <repo-url>
cd TaskManager

# Install backend dependencies
cd backend
npm install

# Setup environment
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret

# Install frontend dependencies
cd ../frontend
npm install

# Setup environment
cp .env.example .env.local
# Keep default NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Running Locally

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Then open http://localhost:3000 in your browser.

---

## Production Deployment

### Vercel Frontend Deployment

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend-domain.com
   ```
4. Deploy

### Backend Deployment (Railway, Render, Heroku)

1. Set environment variables in deployment platform:
   ```
   MONGODB_URI=mongodb+srv://...
   FRONTEND_URL=https://your-frontend.vercel.app
   JWT_SECRET=production-secret-key
   PORT=3001
   NODE_ENV=production
   ```

2. Configure CORS in `backend/src/middlewares/cors.ts`:
   ```typescript
   export const CORS_CONFIG = {
     origin: [
       'https://your-frontend.vercel.app',
       'https://your-domain.com'
     ],
   };
   ```

---

## Troubleshooting

### Backend Won't Start
```bash
# Check if port 3001 is in use
lsof -i :3001

# Kill process using the port
kill -9 <PID>

# Try a different port
echo "PORT=3002" >> .env
```

### MongoDB Connection Failed
```bash
# Verify MongoDB is running
mongo --eval "db.adminCommand('ping')"

# Check connection string in .env
# Format: mongodb://[user:password@]host:port/database
```

### Socket.IO Connection Errors
```bash
# 1. Check backend is running
curl http://localhost:3001/health

# 2. Verify environment variables
echo "API_URL: $NEXT_PUBLIC_API_URL"

# 3. Check CORS configuration
# in backend/src/middlewares/cors.ts
```

### Token/Authentication Issues
```bash
# Clear browser storage and login again
localStorage.clear()
sessionStorage.clear()
```

---

## Environment-Specific Configuration

### Development
- All requests go to `http://localhost:3001`
- Socket.IO uses WebSocket (faster)
- Verbose logging enabled
- No request throttling

### Staging
- Requests go to staging backend at `https://staging-api.yourdomain.com`
- Socket.IO uses WebSocket with polling fallback
- Normal logging
- Rate limiting enabled

### Production
- Requests go to production backend at `https://api.yourdomain.com`
- Socket.IO uses polling (safer for proxies)
- Error logging only
- Full rate limiting and security headers

---

## Optional Services

### Email Configuration
To enable email notifications:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### Redis (Session Management)
```env
REDIS_URL=redis://localhost:6379
```

### LiveKit (Video Calls)
```env
LIVEKIT_URL=https://livekit.yourdomain.com
LIVEKIT_API_KEY=your-key
LIVEKIT_API_SECRET=your-secret
```

---

## Verifying Setup

Run this checklist to verify everything is configured correctly:

- [ ] Backend starts without errors
- [ ] Frontend connects to `http://localhost:3000`
- [ ] Can create an account and login
- [ ] Socket.IO connects (green status indicator)
- [ ] Can see console messages like "✅ Socket connected"
- [ ] Can send messages in channel (if testing in team)
- [ ] No "Connection Lost" warning banner at top

---

## Getting Help

If you run into issues:

1. **Check `SOCKET_IO_TROUBLESHOOTING.md`** for connection problems
2. **Review backend logs** for server errors: `npm run dev` output
3. **Check browser DevTools** (F12 → Network tab for WebSocket status)
4. **Verify environment files** exist and have correct values
5. **Restart both servers** and clear cache (CTRL+Shift+Delete)
