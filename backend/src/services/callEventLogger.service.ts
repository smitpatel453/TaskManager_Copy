import mongoose from 'mongoose';
import { ChannelMessageModel } from '../models/channelMessage.model';
import { CallHistoryModel } from '../models/callHistory.model';
import { getIO } from '../infrastructure/socket.js';

/**
 * Service to log call events as messages in a channel
 * Similar to WhatsApp call history display
 */
export class CallEventLogger {
  /**
   * Log a call event as a system message in the channel
   */
  static async logCallEvent(
    channelId: string,
    callHistoryId: mongoose.Types.ObjectId,
    initiatorId: mongoose.Types.ObjectId
  ) {
    try {
      // Fetch the call history details
      const callHistory = await CallHistoryModel.findById(callHistoryId)
        .populate('initiatorId participantIds', 'firstName lastName');

      if (!callHistory) {
        console.error(`Call history not found: ${callHistoryId}`);
        return;
      }

      // Determine call status
      let status: 'completed' | 'missed' | 'declined' = 'completed';
      if (callHistory.endedAt && callHistory.duration === 0) {
        status = 'missed'; // Call not answered
      }

      // Create a call history message
      const callHistoryMessage = new ChannelMessageModel({
        channelId,
        sender: initiatorId,
        messageType: 'call',
        isSystemMessage: true,
        callHistory: {
          type: callHistory.type,
          duration: callHistory.duration,
          participants: callHistory.participantIds.map((p: any) => ({
            _id: p._id,
            firstName: p.firstName,
            lastName: p.lastName
          })),
          initiatorId: callHistory.initiatorId._id,
          status,
          callHistoryId: callHistory._id
        }
      });

      await callHistoryMessage.save();
      console.log(`✅ Call event logged: ${callHistoryId} in channel ${channelId}`);

      // Populate sender for socket emission
      const populatedMessage = await callHistoryMessage.populate('sender', 'firstName lastName');

      // Emit the message via socket.io so it appears in real-time
      try {
        const io = getIO();
        io.to(channelId).emit('receive_message', {
          _id: populatedMessage._id,
          channelId,
          text: undefined,
          sender: populatedMessage.sender,
          mentions: [],
          attachments: [],
          messageType: 'call',
          isSystemMessage: true,
          callHistory: populatedMessage.callHistory,
          createdAt: populatedMessage.createdAt,
          updatedAt: populatedMessage.updatedAt
        });
      } catch (ioError) {
        console.error('Error emitting call message via socket.io:', ioError);
      }

      return callHistoryMessage;
    } catch (error) {
      console.error('Error logging call event:', error);
      throw error;
    }
  }

  /**
   * Get call history messages for a channel
   */
  static async getCallHistoryMessages(channelId: string, limit = 50) {
    try {
      const messages = await ChannelMessageModel.find({
        channelId,
        messageType: 'call'
      })
        .populate('sender', 'firstName lastName')
        .populate('callHistory.participants', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(limit);

      return messages;
    } catch (error) {
      console.error('Error fetching call history messages:', error);
      throw error;
    }
  }

  /**
   * Get mixed messages (all types) for a channel
   */
  static async getChannelMessages(
    channelId: string,
    limit = 50,
    skip = 0
  ) {
    try {
      const messages = await ChannelMessageModel.find({ channelId })
        .populate('sender', 'firstName lastName avatar')
        .populate('mentions', 'firstName lastName')
        .populate('callHistory.participants', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return messages.reverse(); // Show oldest first
    } catch (error) {
      console.error('Error fetching channel messages:', error);
      throw error;
    }
  }
}

export default CallEventLogger;
