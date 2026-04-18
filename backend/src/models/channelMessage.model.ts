import mongoose, { Document, Schema } from 'mongoose';

export interface ChannelMessageAttachment {
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface CallHistoryData {
  type: 'voice' | 'video';
  duration: number; // in seconds
  participants: Array<{
    _id: mongoose.Types.ObjectId;
    firstName: string;
    lastName: string;
  }>;
  initiatorId: mongoose.Types.ObjectId;
  status: 'completed' | 'missed' | 'declined';
  callHistoryId?: mongoose.Types.ObjectId;
}

export interface ReplyToData {
  messageId: mongoose.Types.ObjectId;
  text?: string;
  senderName: string;
  senderId: mongoose.Types.ObjectId;
}

export interface ChannelMessageDocument extends Document {
  channelId: string;
  text?: string;
  sender: mongoose.Types.ObjectId;
  mentions: mongoose.Types.ObjectId[];
  attachments: ChannelMessageAttachment[];
  isSystemMessage?: boolean; // For bot/system messages like call history
  callHistory?: CallHistoryData; // Call event metadata
  messageType?: 'text' | 'call' | 'system'; // Type of message
  replyTo?: ReplyToData | null; // Reply reference
  createdAt: Date;
  updatedAt: Date;
}

const CallHistoryDataSchema = new Schema<CallHistoryData>(
  {
    type: { type: String, enum: ['voice', 'video'], required: true },
    duration: { type: Number, default: 0 },
    participants: [
      {
        _id: { type: Schema.Types.ObjectId, ref: 'users' },
        firstName: String,
        lastName: String
      }
    ],
    initiatorId: { type: Schema.Types.ObjectId, ref: 'users', required: true },
    status: { type: String, enum: ['completed', 'missed', 'declined'], default: 'completed' },
    callHistoryId: { type: Schema.Types.ObjectId, ref: 'call_history' }
  },
  { _id: false }
);

const ReplyToDataSchema = new Schema<ReplyToData>(
  {
    messageId: { type: Schema.Types.ObjectId, ref: 'ChannelMessage', required: true },
    text: { type: String, trim: true },
    senderName: { type: String, required: true, trim: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'users', required: true }
  },
  { _id: false }
);

const ChannelMessageAttachmentSchema = new Schema<ChannelMessageAttachment>({
  fileName: { type: String, required: true, trim: true },
  url: { type: String, required: true, trim: true },
  mimeType: { type: String, required: true, trim: true },
  size: { type: Number, required: true, min: 0 }
}, { _id: false });

const ChannelMessageSchema = new Schema<ChannelMessageDocument>({
  channelId: { type: String, required: true, index: true },
  text: { type: String, trim: true, default: '' },
  sender: { type: Schema.Types.ObjectId, ref: 'users', required: true },
  mentions: [{ type: Schema.Types.ObjectId, ref: 'users' }],
  attachments: { type: [ChannelMessageAttachmentSchema], default: [] },
  isSystemMessage: { type: Boolean, default: false },
  callHistory: { type: CallHistoryDataSchema },
  messageType: { type: String, enum: ['text', 'call', 'system'], default: 'text' },
  replyTo: { type: ReplyToDataSchema, default: null }
}, { timestamps: true });

ChannelMessageSchema.pre('validate', function channelMessageValidate() {
  const hasText = Boolean(this.text && this.text.trim().length > 0);
  const hasAttachments = Array.isArray(this.attachments) && this.attachments.length > 0;
  const hasCallHistory = Boolean(this.callHistory);

  if (!hasText && !hasAttachments && !hasCallHistory) {
    this.invalidate('text', 'Message must include text, attachment, or call history');
  }
});

export const ChannelMessageModel = mongoose.model<ChannelMessageDocument>('ChannelMessage', ChannelMessageSchema);
