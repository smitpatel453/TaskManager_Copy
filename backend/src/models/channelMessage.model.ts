import mongoose, { Document, Schema } from 'mongoose';

export interface ChannelMessageAttachment {
  fileName: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface ChannelMessageDocument extends Document {
  channelId: string;
  text?: string;
  sender: mongoose.Types.ObjectId;
  mentions: mongoose.Types.ObjectId[];
  attachments: ChannelMessageAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

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
  attachments: { type: [ChannelMessageAttachmentSchema], default: [] }
}, { timestamps: true });

ChannelMessageSchema.pre('validate', function channelMessageValidate() {
  const hasText = Boolean(this.text && this.text.trim().length > 0);
  const hasAttachments = Array.isArray(this.attachments) && this.attachments.length > 0;

  if (!hasText && !hasAttachments) {
    this.invalidate('text', 'Message must include text or attachment');
  }
});

export const ChannelMessageModel = mongoose.model<ChannelMessageDocument>('ChannelMessage', ChannelMessageSchema);
