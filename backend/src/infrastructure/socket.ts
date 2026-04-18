import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { CORS_CONFIG } from '../middlewares/cors.js';
import { ChannelMessageModel } from '../models/channelMessage.model.js';
import { verifyToken } from './database/jwt.js';
import { ChannelModel } from '../models/channel.model.js';
import { InboxModel } from '../models/inbox.model.js';
import mongoose from 'mongoose';

function canAccessChannel(channel: { isPrivate: boolean; members: Array<{ toString: () => string }> }, userId: string): boolean {
  if (!channel.isPrivate) return true;
  return (channel.members || []).some((m) => m.toString() === userId);
}

function canSendMessage(channel: { isPrivate: boolean; members: Array<{ toString: () => string }>; joinedMembers: Array<{ toString: () => string }> }, userId: string): boolean {
  return canAccessChannel(channel, userId) && (channel.joinedMembers || []).some((j) => j.toString() === userId);
}

function canReceiveMessages(channel: { isPrivate: boolean; members: Array<{ toString: () => string }>; joinedMembers: Array<{ toString: () => string }> }, userId: string): boolean {
  return canAccessChannel(channel, userId) && (channel.joinedMembers || []).some((j) => j.toString() === userId);
}

function normalizeMentions(mentions: string[] | undefined): mongoose.Types.ObjectId[] {
  if (!Array.isArray(mentions)) return [];
  return mentions
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

function normalizeAttachments(attachments: Array<{ fileName?: string; url?: string; mimeType?: string; size?: number }> | undefined) {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .filter((file) => typeof file?.url === 'string' && file.url.trim().length > 0)
    .map((file) => ({
      fileName: (file.fileName || 'attachment').trim(),
      url: (file.url || '').trim(),
      mimeType: (file.mimeType || 'application/octet-stream').trim(),
      size: typeof file.size === 'number' && file.size > 0 ? file.size : 0,
    }));
}

let io: SocketIOServer;

export const initializeSocket = (httpServer: HttpServer) => {
  console.log(`[Socket.IO] 🚀 Initializing Socket.IO server...`);
  
  io = new SocketIOServer(httpServer, {
    cors: CORS_CONFIG,
    // Enable all transports: WebSocket first (for traditional servers), polling fallback
    transports: ['websocket', 'polling'],
    // Polling configuration for serverless environments
    pingInterval: 25000,
    pingTimeout: 60000,
    // Allow large buffers for message payloads
    maxHttpBufferSize: 1e6,
  });

  console.log(`[Socket.IO] ✅ Transports enabled: websocket, polling`);


  io.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth?.token as string | undefined) ||
        (socket.handshake.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, '');

      if (!token) {
        next(new Error('Unauthorized'));
        return;
      }

      const payload = await verifyToken(token);
      if (!payload?.userId) {
        next(new Error('Unauthorized'));
        return;
      }

      socket.data.userId = payload.userId;
      next();
    } catch (error) {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const transport = socket.conn.transport.name;
    console.log(`🔌 Client connected: ${socket.id}`);
    console.log(`   📡 Transport: ${transport}`);
    console.log(`   👤 User ID: ${socket.data.userId}`);

    const bootstrapRooms = async () => {
      try {
        const userId = socket.data.userId as string | undefined;
        if (!userId) return;

        // Join socket rooms for ALL channels the user is a member of.
        // This includes both `members` (access list for private channels) AND
        // `joinedMembers` (chat-joined list). Using `members` ensures that
        // users on other pages still receive call notifications (channel:call-started).
        const channels = await ChannelModel.find({
          $or: [
            { members: userId },
            { joinedMembers: userId },
          ]
        })
          .select('channelId')
          .lean();

        for (const channel of channels) {
          if (channel.channelId) {
            socket.join(channel.channelId);
          }
        }
        console.log(`👥 Bootstrapped ${channels.length} channel room(s) for user ${userId}`);
      } catch (error) {
        console.error('Error bootstrapping socket rooms:', error);
      }
    };

    bootstrapRooms();

    socket.on('join_channel', async (channelId: string) => {
      try {
        const userId = socket.data.userId as string | undefined;
        if (!userId) return;

        const channel = await ChannelModel.findOne({ channelId }).lean();
        if (!channel) return;
        if (!canReceiveMessages(channel as any, userId)) return;

        socket.join(channelId);
        console.log(`Client ${socket.id} joined channel ${channelId}`);
      } catch (error) {
        console.error('Error joining channel room:', error);
      }
    });

    socket.on('leave_channel', (channelId: string) => {
      if (channelId && typeof channelId === 'string') {
        socket.leave(channelId);
        console.log(`✓ Socket left channel: ${channelId}`);
      } else {
        console.warn(`⚠️ Invalid leave_channel request - invalid channelId:`, channelId);
      }
    });

    socket.on('send_message', async (data: {
      channelId: string;
      text?: string;
      senderId?: string;
      mentions?: string[];
      attachments?: Array<{ fileName?: string; url?: string; mimeType?: string; size?: number }>;
    }) => {
      try {
        const userId = socket.data.userId as string | undefined;
        if (!userId) return;

        const channel = await ChannelModel.findOne({ channelId: data.channelId });
        if (!channel) return;
        if (!canSendMessage(channel as any, userId)) {
          socket.emit('socket_error', { error: 'Not allowed to send message in this channel' });
          return;
        }

        const text = (data.text || '').trim();
        const mentions = normalizeMentions(data.mentions);
        const attachments = normalizeAttachments(data.attachments);

        if (!text && attachments.length === 0) {
          socket.emit('socket_error', { error: 'Message cannot be empty' });
          return;
        }

        // Save to database
        const newMessage = await ChannelMessageModel.create({
          channelId: data.channelId,
          text,
          sender: userId,
          mentions,
          attachments,
        });

        // Populate sender details before emitting
        const senderPopulatedMessage = await newMessage.populate('sender', 'firstName lastName email');
        const populatedMessage = await senderPopulatedMessage.populate('mentions', 'firstName lastName email');

        // Broadcast to everyone in channel including sender
        io.to(data.channelId).emit('receive_message', populatedMessage);
      } catch (error) {
        console.error('Error handling send_message event:', error);
      }
    });

    socket.on('typing_start', async (data: { channelId: string }) => {
      try {
        const userId = socket.data.userId as string | undefined;
        if (!userId || !data.channelId) return;
        socket.to(data.channelId).emit('user_typing_start', {
          channelId: data.channelId,
          userId,
        });
      } catch (error) {
        console.error('Error handling typing_start event:', error);
      }
    });

    socket.on('typing_stop', async (data: { channelId: string }) => {
      try {
        const userId = socket.data.userId as string | undefined;
        if (!userId || !data.channelId) return;
        socket.to(data.channelId).emit('user_typing_stop', {
          channelId: data.channelId,
          userId,
        });
      } catch (error) {
        console.error('Error handling typing_stop event:', error);
      }
    });

    socket.on('send_notification', async (data: {
      recipientId: string;
      title: string;
      message: string;
      type: string;
      taskName?: string;
      taskId?: string;
      newStatus?: string;
      previousStatus?: string;
    }) => {
      try {
        const senderId = socket.data.userId as string | undefined;
        if (!senderId || !data.recipientId) return;

        // Save notification to database
        const inboxModel = new InboxModel();
        const notification = await inboxModel.create({
          recipientId: new mongoose.Types.ObjectId(data.recipientId),
          senderId: new mongoose.Types.ObjectId(senderId),
          taskId: data.taskId ? new mongoose.Types.ObjectId(data.taskId) : null,
          taskName: data.taskName || 'Notification',
          type: data.type || 'task-assigned',
          title: data.title,
          message: data.message,
          newStatus: data.newStatus,
          previousStatus: data.previousStatus,
          isRead: false,
          createdAt: new Date(),
        });

        // Emit to recipient in real-time
        io.to(`user:${data.recipientId}`).emit('notification:received', {
          _id: notification._id,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          taskName: notification.taskName,
          taskId: notification.taskId,
          newStatus: notification.newStatus,
          isRead: false,
          createdAt: notification.createdAt,
        });

        console.log(`📬 Notification sent to user ${data.recipientId}`);
      } catch (error) {
        console.error('Error handling send_notification event:', error);
      }
    });

    // Join user-specific room for notifications
    const userId = socket.data.userId as string | undefined;
    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`✓ Socket joined user room: user:${userId}`);
    }

    socket.on('disconnect', (reason) => {
      const transport = socket.conn?.transport?.name || 'unknown';
      console.log(`🔌 Client disconnected: ${socket.id}`);
      console.log(`   📡 Last transport: ${transport}`);
      console.log(`   📍 Disconnect reason: ${reason}`);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};

/**
 * Emit a real-time notification to a specific user
 * Called from services when notifications are created
 */
export const emitNotification = (recipientId: string, notification: {
  _id: string;
  title: string;
  message: string;
  type: string;
  taskName?: string;
  taskId?: string;
  newStatus?: string;
  previousStatus?: string;
  senderId?: string;
  createdAt: Date;
}) => {
  try {
    if (!io) return console.warn('Socket.IO not initialized, cannot emit notification');
    
    io.to(`user:${recipientId}`).emit('notification:received', {
      _id: notification._id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      taskName: notification.taskName || 'Notification',
      taskId: notification.taskId,
      newStatus: notification.newStatus,
      previousStatus: notification.previousStatus,
      senderId: notification.senderId,
      isRead: false,
      createdAt: notification.createdAt,
    });

    console.log(`📬 Real-time notification emitted to user ${recipientId}`);
  } catch (error) {
    console.error('Error emitting notification:', error);
  }
};

/**
 * Emit task updates in real-time to all connected users
 * Broadcasts to a 'tasks' namespace so any user viewing tasks gets the update
 */
export const emitTaskUpdate = (taskId: string, taskData: {
  _id: string;
  taskName: string;
  status: string;
  previousStatus?: string;
  updatedBy?: string;
  updatedByName?: string;
  updatedAt: Date;
}) => {
  try {
    if (!io) return console.warn('Socket.IO not initialized, cannot emit task update');
    
    // Broadcast to a global 'tasks' room (all users viewing tasks)
    io.emit('task:updated', {
      _id: taskData._id,
      taskId: taskId,
      taskName: taskData.taskName,
      status: taskData.status,
      previousStatus: taskData.previousStatus,
      updatedBy: taskData.updatedBy,
      updatedByName: taskData.updatedByName,
      updatedAt: taskData.updatedAt,
    });

    console.log(`📋 Task update emitted: ${taskData.taskName} → ${taskData.status}`);
  } catch (error) {
    console.error('Error emitting task update:', error);
  }
};
