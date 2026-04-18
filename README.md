# 📋 Task Manager

A modern, full-stack task management application with real-time collaboration, video calls, and team management. Built with Next.js, Express, MongoDB, and Socket.IO.

## ✨ Features

- **Real-time Messaging**: Instant message delivery with Socket.IO
- **Video & Audio Calls**: Built-in voice and video calling with LiveKit
- **Team Management**: Create teams, organize projects, and manage team members
- **Task Management**: Create, assign, and track tasks with priorities and deadlines
- **Channel Communication**: Organize conversations by channels and teams
- **Call History**: WhatsApp-style call history in messaging threads
- **User Presence**: See who's online in real-time
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Accessibility**: Text size adjustment, reduced motion, high contrast modes
- **Dark Mode**: Built-in dark theme support

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org))
- **MongoDB** 5+ ([Download](https://www.mongodb.com/try/download/community))
- **npm** or **pnpm**

### 1. Clone & Install

```bash
git clone <repository-url>
cd TaskManager

# Backend setup
cd backend
npm install
cp .env.example .env

# Frontend setup
cd ../frontend
npm install
cp .env.example .env.local
```

### 2. Configure Environment Files

**Backend (`backend/.env`):**
```env
MONGODB_URI=mongodb://localhost:27017/task-manager
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-secret-key-here
```

**Frontend (`frontend/.env.local`):**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Start Development Servers

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

Open http://localhost:3000 and start using the app! 🎉

---

## 📚 Documentation

### Core Setup & Configuration
- **[ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md)** - Detailed environment setup for development and production
- **[SOCKET_IO_TROUBLESHOOTING.md](./SOCKET_IO_TROUBLESHOOTING.md)** - Real-time connection debugging guide
- **[CALL_HISTORY_INTEGRATION_GUIDE.md](./CALL_HISTORY_INTEGRATION_GUIDE.md)** - Implementing call history features

### Architecture

```
TaskManager/
├── backend/                 # Express.js + Node.js server
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── models/         # MongoDB schemas
│   │   ├── services/       # Business logic
│   │   ├── routes/         # API endpoints
│   │   ├── middlewares/    # Auth, CORS, error handling
│   │   ├── infrastructure/ # Socket.IO, database
│   │   └── config/         # Configuration files
│   └── package.json
│
├── frontend/                # Next.js 16 + React 19
│   ├── app/
│   │   ├── dashboard/      # Main app pages
│   │   ├── components/     # Reusable components
│   │   ├── providers/      # Context providers (Socket, Auth)
│   │   └── layout.tsx      # Root layout
│   ├── components/         # Shared UI components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities and helpers
│   └── package.json
│
└── ecosystem.config.js      # PM2 configuration
```

---

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 16.1.6 with Turbopack
- **React**: 19.2.3 (latest)
- **UI Components**: PrimeReact, Heroicons
- **Styling**: Tailwind CSS 3
- **Real-time**: Socket.IO Client
- **State**: React Query (TanStack), localStorage
- **API**: Axios with auth interceptors

### Backend
- **Framework**: Express.js
- **Runtime**: Node.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.IO
- **Authentication**: JWT
- **Video Calls**: LiveKit
- **Email**: Nodemailer (SMTP)
- **Caching**: Redis (optional)

---

## 📖 Project Structure

### Backend Controllers
- `auth.controller.ts` - Login, signup, session management
- `channels.controller.ts` - Channel CRUD operations
- `tasks.controller.ts` - Task management
- `teams.controller.ts` - Team management
- `users.controller.ts` - User profiles and settings
- `videocalls.controller.ts` - Video call API
- `dashboard.controller.ts` - Dashboard analytics

### Frontend Pages
- `/dashboard` - Main dashboard
- `/dashboard/settings` - User settings with accessibility options
- `/dashboard/[teamId]` - Team view
- `/dashboard/[teamId]/[projectId]` - Project view
- `/dashboard/[teamId]/[projectId]/[id]` - Task detail view

### Real-time Events (Socket.IO)
- `message` - New message in channel
- `message:updated` - Message edited
- `message:deleted` - Message deleted
- `call:initiated` - Call started
- `call:ended` - Call finished
- `user:online` - User came online
- `user:offline` - User went offline

---

## 🔧 Configuration

### Socket.IO Configuration
```typescript
// Automatic detection of environment
// - Local: WebSocket + polling
// - Vercel: Polling only (WebSocket not supported)

const transports = isVercel 
  ? ['polling'] 
  : ['websocket', 'polling'];
```

### CORS Configuration
Edit `backend/src/middlewares/cors.ts`:
```typescript
export const CORS_CONFIG = {
  origin: [
    'http://localhost:3000',
    'https://your-domain.com'
  ],
  credentials: true,
};
```

---

## 🚀 Deployment

### Frontend (Vercel)
```bash
# Vercel handles deployment automatically from GitHub
# Set environment variables in Vercel dashboard:
NEXT_PUBLIC_API_URL=https://your-backend.com
```

### Backend (Railway/Render/Heroku)
```bash
# Set these environment variables:
MONGODB_URI=mongodb+srv://...
FRONTEND_URL=https://your-frontend.vercel.app
JWT_SECRET=production-secret
NODE_ENV=production
```

See [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md) for detailed production setup.

---

## 🐛 Troubleshooting

### Connection Issues
If you see "🔴 Connection Lost" in the UI:
1. **Check backend is running**: `curl http://localhost:3001/health`
2. **Verify environment variables**: See [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md)
3. **Check Socket.IO logs**: Server console should show connection details
4. **Full debugging guide**: [SOCKET_IO_TROUBLESHOOTING.md](./SOCKET_IO_TROUBLESHOOTING.md)

### Authentication Issues
1. Clear browser cache: `localStorage.clear()`
2. Login again
3. Check JWT_SECRET is set in backend .env

### Database Issues
1. Ensure MongoDB is running: `mongod` or `brew services start mongodb-community`
2. Verify MONGODB_URI in backend .env
3. Check database name matches

---

## 📊 Database Schema

### Collections
- **users** - User profiles, settings, preferences
- **teams** - Team information
- **projects** - Projects within teams
- **tasks** - Tasks with assignments and deadlines
- **channels** - Communication channels
- **channelMessages** - Messages with call history support
- **callHistory** - Call metadata and analytics

### Call History Document
```typescript
{
  _id: ObjectId,
  messageType: 'call',
  callHistory: {
    type: 'audio' | 'video',
    duration: number,
    participants: string[],
    initiatorId: string,
    status: 'completed' | 'missed' | 'declined',
  },
  channelId: string,
  timestamp: Date
}
```

---

## 🎯 Key Features Implementation

### Real-time Messaging
- Socket.IO event: `message`
- Automatic message persistence to MongoDB
- Message status tracking (sent/delivered/read)

### Video/Audio Calls
- LiveKit integration for P2P calls
- Call duration tracking
- Automatic call history logging
- Call participant tracking

### Settings & Accessibility
- **Text Size**: 80% - 130% adjustable
- **Reduced Motion**: Disables all animations
- **High Contrast**: Enhanced visibility for accessibility
- **Accent Colors**: 7 customizable color options
- **Theme**: Light/Dark mode support

### Call History
- WhatsApp-style display in chat threads
- Call type badge (📹 video / ☎️ audio)
- Duration tracking
- Participant list
- Status indicators (completed/missed/declined)

---

## 📝 Environment Variables Reference

### Essential Variables
| Variable | Backend | Frontend | Default | Description |
|----------|---------|----------|---------|-------------|
| `MONGODB_URI` | ✅ | ❌ | localhost | MongoDB connection string |
| `PORT` | ✅ | ❌ | 3001 | Server port |
| `JWT_SECRET` | ✅ | ❌ | (required) | JWT signing secret |
| `FRONTEND_URL` | ✅ | ❌ | localhost:3000 | Frontend URL for CORS |
| `NEXT_PUBLIC_API_URL` | ❌ | ✅ | localhost:3001 | Backend API URL |

See [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md) for complete reference.

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -m "Add my feature"`
3. Push to branch: `git push origin feature/my-feature`
4. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see LICENSE file for details.

---

## 🆘 Getting Help

- **Connection issues?** See [SOCKET_IO_TROUBLESHOOTING.md](./SOCKET_IO_TROUBLESHOOTING.md)
- **Setup questions?** See [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md)
- **Call history?** See [CALL_HISTORY_INTEGRATION_GUIDE.md](./CALL_HISTORY_INTEGRATION_GUIDE.md)

---

**Made with ❤️ using modern web technologies**
