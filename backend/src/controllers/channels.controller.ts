import { Request, Response } from 'express';
import { ChannelMessageModel } from '../models/channelMessage.model.js';
import { ChannelModel } from '../models/channel.model.js';
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs/promises';
import { getIO } from '../infrastructure/socket.js';

type ChannelUser = {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
};

type ChannelLean = {
  channelId: string;
  name: string;
  isPrivate: boolean;
  members?: Array<mongoose.Types.ObjectId | string>;
  joinedMembers?: Array<mongoose.Types.ObjectId | string>;
  createdBy?: mongoose.Types.ObjectId | string;
};

type ChannelBody = {
  name?: string;
  isPrivate?: boolean;
  members?: string[];
};

type CreateChannelMessageBody = {
  text?: string;
  mentions?: string[];
  attachments?: Array<{
    fileName?: string;
    url?: string;
    mimeType?: string;
    size?: number;
  }>;
};

const DEFAULT_CHANNELS = [
  { channelId: 'general', name: 'General' },
  { channelId: 'welcome', name: 'Welcome' },
];

function normalizeChannelId(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
}

async function ensureDefaultChannels(userId: string): Promise<void> {
  if (!mongoose.Types.ObjectId.isValid(userId)) return;

  for (const chan of DEFAULT_CHANNELS) {
    const exists = await ChannelModel.findOne({ channelId: chan.channelId }).lean();
    if (!exists) {
      await ChannelModel.create({
        channelId: chan.channelId,
        name: chan.name,
        isPrivate: false,
        members: [],
        joinedMembers: [new mongoose.Types.ObjectId(userId)],
        createdBy: new mongoose.Types.ObjectId(userId),
      });
    }
  }
}

function canAccessChannel(channel: { isPrivate: boolean; members?: Array<mongoose.Types.ObjectId | string> }, userId: string): boolean {
  if (!channel.isPrivate) return true;
  return (channel.members || []).some((m: any) => (m?._id?.toString?.() || m?.toString?.()) === userId);
}

function hasJoinedChannel(channel: { joinedMembers?: Array<mongoose.Types.ObjectId | string> }, userId: string): boolean {
  return (channel.joinedMembers || []).some((m: any) => (m?._id?.toString?.() || m?.toString?.()) === userId);
}

function mapChannelUsers(users: any[] | undefined): ChannelUser[] {
  if (!Array.isArray(users)) return [];

  return users.map((m) => ({
    _id: m._id?.toString?.() || m.toString?.() || '',
    firstName: m.firstName || '',
    lastName: m.lastName || '',
    email: m.email,
  }));
}

function toObjectIds(ids: string[] | undefined): mongoose.Types.ObjectId[] {
  if (!Array.isArray(ids)) return [];
  return ids
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

function normalizeAttachments(input: CreateChannelMessageBody['attachments']) {
  if (!Array.isArray(input)) return [];

  return input
    .filter((item) => item && typeof item.url === 'string' && item.url.trim().length > 0)
    .map((item) => ({
      fileName: (item?.fileName || 'attachment').trim(),
      url: (item?.url || '').trim(),
      mimeType: (item?.mimeType || 'application/octet-stream').trim(),
      size: typeof item?.size === 'number' && item.size > 0 ? item.size : 0,
    }));
}

function toMessagePayload(message: any) {
  return {
    _id: message._id?.toString?.() || '',
    channelId: message.channelId,
    text: message.text || '',
    sender: message.sender
      ? {
        _id: message.sender._id?.toString?.() || message.sender.toString?.() || '',
        firstName: message.sender.firstName || '',
        lastName: message.sender.lastName || '',
        email: message.sender.email,
      }
      : null,
    mentions: mapChannelUsers(message.mentions),
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
    createdAt: message.createdAt,
    updatedAt: message.updatedAt,
  };
}

function toAbsoluteUploadUrl(req: Request, relativeOrAbsoluteUrl: string): string {
  if (!relativeOrAbsoluteUrl) return '';
  if (/^https?:\/\//i.test(relativeOrAbsoluteUrl)) return relativeOrAbsoluteUrl;

  const normalizedPath = relativeOrAbsoluteUrl.startsWith('/')
    ? relativeOrAbsoluteUrl
    : `/${relativeOrAbsoluteUrl}`;
  return `${req.protocol}://${req.get('host')}${normalizedPath}`;
}

function toChannelPayload(channel: any, userId: string, includeMembers = true) {
  const members = mapChannelUsers(channel.members);
  const joinedMembers = mapChannelUsers(channel.joinedMembers);

  return {
    id: channel.channelId,
    name: channel.name,
    isPrivate: channel.isPrivate === true,
    members: includeMembers ? members : [],
    joinedMembers: includeMembers ? joinedMembers : [],
    createdBy: channel.createdBy?._id?.toString?.() || channel.createdBy?.toString?.() || '',
    joinedMemberIds: Array.isArray(channel.joinedMembers)
      ? channel.joinedMembers.map((j: any) => j._id?.toString?.() || j.toString?.())
      : [],
    joined: Array.isArray(channel.joinedMembers)
      ? channel.joinedMembers.some((j: any) => (j._id?.toString?.() || j.toString?.()) === userId)
      : false,
  };
}

export const getChannels = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await ensureDefaultChannels(userId);

    const channels = await ChannelModel.find({
      $or: [
        { isPrivate: false },
        { members: new mongoose.Types.ObjectId(userId) },
      ],
    })
      .populate('members', 'firstName lastName email')
      .populate('joinedMembers', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: 1 });

    res.status(200).json(channels.map((c) => toChannelPayload(c, userId, false)));
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
};

export const createChannel = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const body = req.body as ChannelBody;
    const rawName = (body.name || '').trim();
    if (!rawName) {
      res.status(400).json({ error: 'Channel name is required' });
      return;
    }

    const channelId = normalizeChannelId(rawName);
    if (!channelId) {
      res.status(400).json({ error: 'Invalid channel name' });
      return;
    }

    const exists = await ChannelModel.findOne({ channelId }).lean();
    if (exists) {
      res.status(409).json({ error: 'Channel already exists' });
      return;
    }

    const isPrivate = body.isPrivate === true;

    const members = new Set<string>();
    members.add(userId);
    if (isPrivate && Array.isArray(body.members)) {
      for (const memberId of body.members) {
        if (mongoose.Types.ObjectId.isValid(memberId)) members.add(memberId);
      }
    }

    const memberObjectIds = Array.from(members).map((m) => new mongoose.Types.ObjectId(m));

    const channel = await ChannelModel.create({
      channelId,
      name: rawName,
      isPrivate,
      members: memberObjectIds,
      joinedMembers: isPrivate ? memberObjectIds : [new mongoose.Types.ObjectId(userId)],
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    const hydrated = await ChannelModel.findById(channel._id)
      .populate('members', 'firstName lastName email')
      .populate('joinedMembers', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    res.status(201).json(toChannelPayload(hydrated, userId));
  } catch (error) {
    console.error('Error creating channel:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
};

export const getChannel = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { channelId } = req.params;
    const channel = await ChannelModel.findOne({ channelId })
      .populate('members', 'firstName lastName email')
      .populate('joinedMembers', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    if (!canAccessChannel(channel, userId)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.status(200).json(toChannelPayload(channel, userId));
  } catch (error) {
    console.error('Error fetching channel:', error);
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
};

export const joinChannel = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { channelId } = req.params;
    const channel = await ChannelModel.findOne({ channelId });
    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    if (channel.isPrivate && !canAccessChannel(channel, userId)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);
    const hasJoined = channel.joinedMembers.some((j) => j.toString() === userId);
    if (!hasJoined) {
      channel.joinedMembers.push(userObjectId);
      await channel.save();
    }

    const hydrated = await ChannelModel.findById(channel._id)
      .populate('members', 'firstName lastName email')
      .populate('joinedMembers', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    const payload = toChannelPayload(hydrated, userId);

    try {
      const io = getIO();
      io.to(channelId).emit('channel_presence_updated', payload);
      io.to(channelId).emit('channel_user_joined', {
        channelId,
        userId,
      });
    } catch (_error) {
      // Socket may not be initialized in non-realtime contexts.
    }

    res.status(200).json(payload);
  } catch (error) {
    console.error('Error joining channel:', error);
    res.status(500).json({ error: 'Failed to join channel' });
  }
};

export const addChannelMember = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { channelId } = req.params;
    const { memberId } = req.body as { memberId?: string };

    if (!memberId || !mongoose.Types.ObjectId.isValid(memberId)) {
      res.status(400).json({ error: 'Valid memberId is required' });
      return;
    }

    const channel = await ChannelModel.findOne({ channelId });
    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    const isCreator = channel.createdBy.toString() === userId;
    if (!isCreator) {
      res.status(403).json({ error: 'Only channel owner or admin can add members' });
      return;
    }

    const alreadyMember = channel.members.some((m) => m.toString() === memberId);
    if (!alreadyMember) {
      channel.members.push(new mongoose.Types.ObjectId(memberId));
    }

    const alreadyJoined = channel.joinedMembers.some((m) => m.toString() === memberId);
    if (!alreadyJoined) {
      channel.joinedMembers.push(new mongoose.Types.ObjectId(memberId));
    }

    await channel.save();

    const hydrated = await ChannelModel.findById(channel._id)
      .populate('members', 'firstName lastName email')
      .populate('joinedMembers', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    res.status(200).json(toChannelPayload(hydrated, userId));
  } catch (error) {
    console.error('Error adding channel member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
};

export const getChannelMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { channelId } = req.params;
    const channel = await ChannelModel.findOne({ channelId }).lean();
    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    if (!canAccessChannel(channel, userId)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    if (!hasJoinedChannel(channel, userId)) {
      res.status(403).json({ error: 'Join channel first to receive messages' });
      return;
    }

    const messages = await ChannelMessageModel.find({ channelId })
      .populate('sender', 'firstName lastName email')
      .populate('mentions', 'firstName lastName email')
      .sort({ createdAt: 1 })
      .limit(200);
    res.status(200).json(messages.map(toMessagePayload));
  } catch (error) {
    console.error('Error fetching channel messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const createChannelMessage = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { channelId } = req.params;
    const channel = await ChannelModel.findOne({ channelId }).lean() as ChannelLean | null;
    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    if (!canAccessChannel(channel, userId) || !hasJoinedChannel(channel, userId)) {
      res.status(403).json({ error: 'Join channel first to send messages' });
      return;
    }

    const body = req.body as CreateChannelMessageBody;
    const text = (body.text || '').trim();
    const mentions = toObjectIds(body.mentions);
    const attachments = normalizeAttachments(body.attachments);

    if (!text && attachments.length === 0) {
      res.status(400).json({ error: 'Message cannot be empty' });
      return;
    }

    const message = await ChannelMessageModel.create({
      channelId,
      text,
      sender: new mongoose.Types.ObjectId(userId),
      mentions,
      attachments,
    });

    const hydrated = await ChannelMessageModel.findById(message._id)
      .populate('sender', 'firstName lastName email')
      .populate('mentions', 'firstName lastName email');

    res.status(201).json(toMessagePayload(hydrated));
  } catch (error) {
    console.error('Error creating channel message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
};

export const uploadChannelFiles = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { channelId } = req.params;
    const channel = await ChannelModel.findOne({ channelId }).lean() as ChannelLean | null;
    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    if (!canAccessChannel(channel, userId) || !hasJoinedChannel(channel, userId)) {
      res.status(403).json({ error: 'Join channel first to upload files' });
      return;
    }

    const files = (req.files || []) as Express.Multer.File[];
    if (!Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const uploadsRoot = path.resolve(process.cwd(), 'uploads', 'channels', channelId);
    await fs.mkdir(uploadsRoot, { recursive: true });

    const uploaded = [] as Array<{ fileName: string; url: string; mimeType: string; size: number }>;
    for (const file of files) {
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const targetPath = path.join(uploadsRoot, safeName);
      await fs.writeFile(targetPath, file.buffer);

      const relativeUrl = `/uploads/channels/${channelId}/${safeName}`;
      uploaded.push({
        fileName: file.originalname,
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size,
        url: toAbsoluteUploadUrl(req, relativeUrl),
      });
    }

    res.status(201).json(uploaded);
  } catch (error) {
    console.error('Error uploading channel files:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
};

export const getChannelMentionSuggestions = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { channelId } = req.params;
    const query = (req.query.q as string | undefined)?.trim().toLowerCase() || '';
    const channel = await ChannelModel.findOne({ channelId })
      .populate('joinedMembers', 'firstName lastName email')
      .lean();

    if (!channel) {
      res.status(404).json({ error: 'Channel not found' });
      return;
    }

    if (!canAccessChannel(channel as ChannelLean, userId)) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const suggestions = mapChannelUsers(channel.joinedMembers as any[])
      .filter((member) => {
        if (!query) return true;
        return `${member.firstName} ${member.lastName} ${member.email || ''}`
          .toLowerCase()
          .includes(query);
      })
      .slice(0, 20);

    res.status(200).json(suggestions);
  } catch (error) {
    console.error('Error fetching mention suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch mention suggestions' });
  }
};

export const getChannelUsers = async (_req: Request, res: Response) => {
  try {
    const db = mongoose.connection.db;
    if (!db) {
      res.status(500).json({ error: 'Database connection failed' });
      return;
    }
    const users = await db
      .collection('users')
      .find({}, { projection: { _id: 1, firstName: 1, lastName: 1, email: 1 } })
      .toArray();
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users for channels:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
};
