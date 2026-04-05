import { Request, Response } from 'express';
import { ChannelModel } from '../models/channel.model.js';
import { UserMongooseModel } from '../models/user.model.js';
import { CallHistoryModel } from '../models/callHistory.model.js';
import { liveKitService } from '../services/livekit.service.js';
import { getIO } from '../infrastructure/socket.js';
import mongoose from 'mongoose';

// Start a video call in a channel
export async function startChannelVideoCall(req: Request, res: Response): Promise<void> {
    try {
        const { channelId } = req.params;
        const { recordingEnabled } = req.body;
        const userId = (req as any).user?.userId;

        console.log('Video call request - userId:', userId, 'channelId:', channelId);

        if (!userId || !channelId) {
            console.error('Missing credentials:', { userId: !!userId, channelId: !!channelId });
            res.status(400).json({ error: 'Missing userId or channelId' });
            return;
        }

        const channel = await ChannelModel.findOne({ channelId }).lean();
        if (!channel) {
            res.status(404).json({ error: 'Channel not found' });
            return;
        }

        const user = await UserMongooseModel.findById(userId).lean();
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        // Generate room name from channel ID
        const roomName = liveKitService.generateRoomName(channelId);

        // Generate access token for this user
        const { token, url } = await liveKitService.generateLiveKitToken({
            userId: userId.toString(),
            userName: `${user.firstName} ${user.lastName}`,
            roomName,
        });

        // Validate token was generated
        if (!token || typeof token !== 'string' || token.length < 50) {
            console.error('❌ Invalid token generated:', { type: typeof token, length: token?.length });
            res.status(500).json({ error: 'Failed to generate valid authentication token' });
            return;
        }

        console.log('✅ Valid token generated:', {
            tokenLength: token.length,
            tokenPreview: token.substring(0, 50) + '...',
            url,
            roomName,
        });

        // Update channel with active call info
        const objectId = new mongoose.Types.ObjectId(userId);
        const startedAt = new Date();

        await ChannelModel.findOneAndUpdate(
            { channelId },
            {
                activeCall: {
                    roomName,
                    startedAt,
                    participants: [objectId],
                },
            },
            { new: true }
        );

        // Create call history record
        const callHistory = await CallHistoryModel.create({
            channelId,
            roomName,
            initiatorId: objectId,
            participantIds: [objectId],
            startedAt,
            recordingEnabled: recordingEnabled || false,
        });

        // Notify other users in the channel that a call has started
        const io = getIO();
        io.to(channelId).emit('channel:call-started', {
            callId: callHistory._id,
            channelId,
            roomName,
            initiator: {
                id: userId,
                name: `${user.firstName} ${user.lastName}`,
            },
            startedAt,
            recordingEnabled: recordingEnabled || false,
        });

        res.json({
            token,
            url,
            roomName,
            channelId,
            callId: callHistory._id,
            recordingEnabled: recordingEnabled || false,
        });
    } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error('❌ Error starting video call:', errorMsg);
        console.error('Full error:', error);

        // Return actual error in development mode for debugging
        res.status(500).json({
            error: 'Failed to start video call',
            details: process.env.NODE_ENV === 'development' ? errorMsg : undefined
        });
    }
}

// Join an existing channel video call
export async function joinChannelVideoCall(req: Request, res: Response): Promise<void> {
    try {
        const { channelId } = req.params;
        const userId = (req as any).user?.userId;

        if (!userId || !channelId) {
            res.status(400).json({ error: 'Missing userId or channelId' });
            return;
        }

        const channel = await ChannelModel.findOne({ channelId }).lean();
        if (!channel) {
            res.status(404).json({ error: 'Channel not found' });
            return;
        }

        if (!channel.activeCall) {
            res.status(400).json({ error: 'No active call in this channel' });
            return;
        }

        const user = await UserMongooseModel.findById(userId).lean();
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const roomName = channel.activeCall.roomName;

        // Generate access token for this user to join the existing room
        const { token, url } = await liveKitService.generateLiveKitToken({
            userId: userId.toString(),
            userName: `${user.firstName} ${user.lastName}`,
            roomName,
        });

        // Validate token was generated
        if (!token || typeof token !== 'string' || token.length < 50) {
            console.error('❌ Invalid token generated for join:', { type: typeof token, length: token?.length });
            res.status(500).json({ error: 'Failed to generate valid authentication token' });
            return;
        }

        console.log('✅ Valid join token generated:', {
            tokenLength: token.length,
            tokenPreview: token.substring(0, 50) + '...',
            roomName,
        });

        // Add user to participants list
        const objectId = new mongoose.Types.ObjectId(userId);
        if (!channel.activeCall.participants.some((p: any) => p.toString() === userId)) {
            await ChannelModel.findOneAndUpdate(
                { channelId },
                {
                    $addToSet: {
                        'activeCall.participants': objectId,
                    },
                },
                { new: true }
            );
        }

        // Notify others that user joined
        const io = getIO();
        io.to(channelId).emit('channel:call-user-joined', {
            channelId,
            user: {
                id: userId,
                name: `${user.firstName} ${user.lastName}`,
            },
        });

        res.json({
            token,
            url,
            roomName,
            channelId,
        });
    } catch (error) {
        console.error('Error joining video call:', error instanceof Error ? error.message : error);
        res.status(500).json({ error: 'Failed to join video call' });
    }
}

// End the video call in a channel
export async function endChannelVideoCall(req: Request, res: Response): Promise<void> {
    try {
        const { channelId } = req.params;
        const { callId } = req.body;
        const userId = (req as any).user?.userId;

        if (!userId || !channelId) {
            res.status(400).json({ error: 'Missing userId or channelId' });
            return;
        }

        const channel = await ChannelModel.findOne({ channelId });
        if (!channel) {
            res.status(404).json({ error: 'Channel not found' });
            return;
        }

        if (!channel.activeCall) {
            res.status(400).json({ error: 'No active call in this channel' });
            return;
        }

        // Calculate call duration
        const endedAt = new Date();
        const duration = Math.floor((endedAt.getTime() - channel.activeCall.startedAt.getTime()) / 1000);

        // Update call history with end time and duration
        if (callId) {
            await CallHistoryModel.findByIdAndUpdate(callId, {
                endedAt,
                duration,
            });
        }

        // Clear the active call
        channel.activeCall = null;
        await channel.save();

        // Notify all users that the call has ended
        const io = getIO();
        io.to(channelId).emit('channel:call-ended', {
            callId,
            channelId,
            endedBy: userId,
            endedAt,
            duration,
        });

        res.json({ success: true, message: 'Call ended', duration });
    } catch (error) {
        console.error('Error ending video call:', error instanceof Error ? error.message : error);
        res.status(500).json({ error: 'Failed to end video call' });
    }
}

// Remove a user from the active call
export async function leaveChannelVideoCall(req: Request, res: Response): Promise<void> {
    try {
        const { channelId } = req.params;
        const userId = (req as any).user?.userId;

        if (!userId || !channelId) {
            res.status(400).json({ error: 'Missing userId or channelId' });
            return;
        }

        const channel = await ChannelModel.findOne({ channelId });
        if (!channel || !channel.activeCall) {
            res.status(400).json({ error: 'No active call in this channel' });
            return;
        }

        // Remove user from participants
        channel.activeCall.participants = channel.activeCall.participants.filter(
            (p: any) => p.toString() !== userId
        );

        // Check if this was the last participant
        const wasLastParticipant = channel.activeCall.participants.length === 0;

        // If no participants left, end the call
        if (wasLastParticipant) {
            channel.activeCall = null;
        }

        await channel.save();

        // Notify others
        const io = getIO();

        if (wasLastParticipant) {
            // If this was the last participant, emit call-ended so all clients know the call is over
            io.to(channelId).emit('channel:call-ended', {
                channelId,
                endedBy: userId,
                endedAt: new Date(),
                reason: 'last_participant_left',
            });
        } else {
            // Otherwise, just notify that a user left
            io.to(channelId).emit('channel:call-user-left', {
                channelId,
                userId,
            });
        }

        res.json({ success: true, message: 'Left the call' });
    } catch (error) {
        console.error('Error leaving video call:', error instanceof Error ? error.message : error);
        res.status(500).json({ error: 'Failed to leave video call' });
    }
}

// Get active call information for a channel
export async function getChannelCallInfo(req: Request, res: Response): Promise<void> {
    try {
        const { channelId } = req.params;
        const userId = (req as any).user?.userId;

        if (!userId || !channelId) {
            res.status(400).json({ error: 'Missing userId or channelId' });
            return;
        }

        const channel = await ChannelModel.findOne({ channelId }).lean();
        if (!channel) {
            res.status(404).json({ error: 'Channel not found' });
            return;
        }

        // If no active call, return early
        if (!channel.activeCall) {
            res.json({
                hasActiveCall: false,
                activeCall: null,
            });
            return;
        }

        // Manually populate participants since they're embedded
        const participantIds = channel.activeCall.participants || [];
        const participants = await UserMongooseModel.find({ _id: { $in: participantIds } })
            .select('firstName lastName email')
            .lean();

        res.json({
            hasActiveCall: true,
            activeCall: {
                ...channel.activeCall,
                participants,
            },
        });
    } catch (error) {
        console.error('Error getting call info:', error);
        res.status(500).json({ error: 'Failed to get call info' });
    }
}

// Get call history for a channel
export async function getChannelCallHistory(req: Request, res: Response): Promise<void> {
    try {
        const { channelId } = req.params;
        const { limit = 10, skip = 0 } = req.query;
        const userId = (req as any).user?.userId;

        if (!userId || !channelId) {
            res.status(400).json({ error: 'Missing userId or channelId' });
            return;
        }

        // Get call history for the channel
        const callHistory = await CallHistoryModel.find({ channelId })
            .populate('initiatorId', 'firstName lastName email')
            .populate('participantIds', 'firstName lastName email')
            .sort({ startedAt: -1 })
            .limit(Number(limit) || 10)
            .skip(Number(skip) || 0)
            .lean();

        const totalCalls = await CallHistoryModel.countDocuments({ channelId });

        res.json({
            calls: callHistory,
            total: totalCalls,
            limit: Number(limit) || 10,
            skip: Number(skip) || 0,
        });
    } catch (error) {
        console.error('Error getting call history:', error);
        res.status(500).json({ error: 'Failed to get call history' });
    }
}

// Enable recording for active call
export async function enableRecording(req: Request, res: Response): Promise<void> {
    try {
        const { channelId } = req.params;
        const { callId } = req.body;
        const userId = (req as any).user?.userId;

        if (!userId || !channelId) {
            res.status(400).json({ error: 'Missing userId or channelId' });
            return;
        }

        const channel = await ChannelModel.findOne({ channelId }).lean();
        if (!channel) {
            res.status(404).json({ error: 'Channel not found' });
            return;
        }

        if (!channel.activeCall) {
            res.status(400).json({ error: 'No active call in this channel' });
            return;
        }

        const roomName = channel.activeCall.roomName;

        // Update call history with recording start time
        if (callId) {
            const updated = await CallHistoryModel.findByIdAndUpdate(
                callId,
                {
                    recordingEnabled: true,
                    recordingStartedAt: new Date(),
                },
                { new: true }
            );

            console.log(`🎥 Recording enabled for call ${callId} in room ${roomName}`);

            // Notify users that recording is enabled
            const io = getIO();
            io.to(channelId).emit('channel:recording-enabled', {
                callId,
                channelId,
                roomName,
                recordingStartedAt: updated?.recordingStartedAt,
            });

            res.json({
                success: true,
                message: 'Recording enabled',
                recordingStartedAt: updated?.recordingStartedAt,
            });
        } else {
            res.status(400).json({ error: 'Missing callId' });
        }
    } catch (error) {
        console.error('Error enabling recording:', error);
        res.status(500).json({ error: 'Failed to enable recording' });
    }
}

// Get user call statistics
export async function getUserCallStats(req: Request, res: Response): Promise<void> {
    try {
        const userId = (req as any).user?.userId;

        if (!userId) {
            res.status(400).json({ error: 'Missing userId' });
            return;
        }

        const objectId = new mongoose.Types.ObjectId(userId);

        // Get stats for initiated calls
        const initiatedCalls = await CallHistoryModel.countDocuments({ initiatorId: objectId });

        // Get stats for participated calls
        const participatedCalls = await CallHistoryModel.countDocuments({
            participantIds: objectId,
        });

        // Calculate total call duration
        const callStats = await CallHistoryModel.aggregate([
            {
                $match: {
                    $or: [
                        { initiatorId: objectId },
                        { participantIds: objectId },
                    ],
                },
            },
            {
                $group: {
                    _id: null,
                    totalDuration: { $sum: '$duration' },
                    totalCalls: { $sum: 1 },
                    averageDuration: { $avg: '$duration' },
                },
            },
        ]);

        const stats = callStats.length > 0 ? callStats[0] : { totalDuration: 0, totalCalls: 0, averageDuration: 0 };

        res.json({
            initiatedCalls,
            participatedCalls,
            totalDuration: stats.totalDuration,
            averageDuration: Math.round(stats.averageDuration || 0),
            totalCalls: stats.totalCalls,
        });
    } catch (error) {
        console.error('Error getting call stats:', error);
        res.status(500).json({ error: 'Failed to get call stats' });
    }
}
