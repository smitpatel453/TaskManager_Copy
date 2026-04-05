import mongoose, { Document, Schema } from "mongoose";

export interface CallHistoryDocument extends Document {
    channelId: string;
    roomName: string;
    initiatorId: mongoose.Types.ObjectId;
    participantIds: mongoose.Types.ObjectId[];
    startedAt: Date;
    endedAt?: Date;
    duration: number; // in seconds
    recordingUrl?: string;
    recordingEnabled: boolean;
    recordingStartedAt?: Date; // When recording was started
    durationVerifiedByLiveKit?: boolean; // Flag to indicate if duration came from LiveKit webhook
    messagesSent: number;
    createdAt: Date;
    updatedAt: Date;
}

const callHistorySchema = new Schema<CallHistoryDocument>(
    {
        channelId: { type: String, required: true, index: true },
        roomName: { type: String, required: true },
        initiatorId: { type: Schema.Types.ObjectId, ref: "users", required: true },
        participantIds: [{ type: Schema.Types.ObjectId, ref: "users" }],
        startedAt: { type: Date, required: true, default: Date.now },
        endedAt: { type: Date },
        duration: { type: Number, default: 0 },
        recordingUrl: { type: String },
        recordingEnabled: { type: Boolean, default: false },
        recordingStartedAt: { type: Date },
        durationVerifiedByLiveKit: { type: Boolean, default: false },
        messagesSent: { type: Number, default: 0 },
    },
    {
        timestamps: true,
        collection: "call_history",
    }
);

// Index for faster queries
callHistorySchema.index({ channelId: 1, startedAt: -1 });
callHistorySchema.index({ initiatorId: 1 });
callHistorySchema.index({ participantIds: 1 });
callHistorySchema.index({ createdAt: -1 });

export const CallHistoryModel =
    (mongoose.models.call_history as mongoose.Model<CallHistoryDocument>) ||
    mongoose.model<CallHistoryDocument>("call_history", callHistorySchema);
