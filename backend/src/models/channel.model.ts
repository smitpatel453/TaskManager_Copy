import mongoose, { Document, Schema } from "mongoose";

export interface ChannelDocument extends Document {
    channelId: string;
    name: string;
    isPrivate: boolean;
    members: mongoose.Types.ObjectId[];
    joinedMembers: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
    activeCall?: {
        roomName: string;
        startedAt: Date;
        participants: mongoose.Types.ObjectId[];
    } | null;
    createdAt: Date;
    updatedAt: Date;
}

const channelSchema = new Schema<ChannelDocument>(
    {
        channelId: { type: String, required: true, unique: true, index: true, trim: true },
        name: { type: String, required: true, trim: true },
        isPrivate: { type: Boolean, default: false },
        members: [{ type: Schema.Types.ObjectId, ref: "users" }],
        joinedMembers: [{ type: Schema.Types.ObjectId, ref: "users" }],
        createdBy: { type: Schema.Types.ObjectId, ref: "users", required: true },
        activeCall: {
            roomName: String,
            startedAt: Date,
            participants: [{ type: Schema.Types.ObjectId, ref: "users" }],
        },
    },
    {
        timestamps: true,
        collection: "channels",
    }
);

channelSchema.index({ isPrivate: 1 });
channelSchema.index({ members: 1 });
channelSchema.index({ joinedMembers: 1 });

export const ChannelModel =
    (mongoose.models.channels as mongoose.Model<ChannelDocument>) ||
    mongoose.model<ChannelDocument>("channels", channelSchema);
