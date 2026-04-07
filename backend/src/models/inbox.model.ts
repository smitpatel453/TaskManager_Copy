import mongoose, { Schema, Document, Model, Types } from "mongoose";

export type NotificationType = "task-assigned" | "task-status-changed";
export type TaskStatusNotificationType = "to-do" | "in-progress" | "completed";

export interface InboxMessageDocument extends Document {
    recipientId: mongoose.Types.ObjectId; // User receiving the notification
    senderId?: mongoose.Types.ObjectId; // User who triggered the notification (admin/user)
    taskId: mongoose.Types.ObjectId; // Related task
    taskName: string; // Task name for easy reference
    type: NotificationType; // Type of notification
    title: string; // Notification title
    message: string; // Notification message
    previousStatus?: TaskStatusNotificationType; // For status change notifications
    newStatus?: TaskStatusNotificationType; // For status change notifications
    isRead: boolean;
    createdAt: Date;
}

const inboxSchema = new Schema<InboxMessageDocument>(
    {
        recipientId: { type: Schema.Types.ObjectId, ref: "users", required: true, index: true },
        senderId: { type: Schema.Types.ObjectId, ref: "users" },
        taskId: { type: Schema.Types.ObjectId, ref: "tasks", required: true, index: true },
        taskName: { type: String, required: true },
        type: { type: String, enum: ["task-assigned", "task-status-changed"], required: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        previousStatus: { type: String, enum: ["to-do", "in-progress", "completed"] },
        newStatus: { type: String, enum: ["to-do", "in-progress", "completed"] },
        isRead: { type: Boolean, default: false, index: true },
        createdAt: { type: Date, default: Date.now, index: true },
    },
    {
        timestamps: false,
        collection: "inbox",
    }
);

// Create indexes for efficient queries
inboxSchema.index({ recipientId: 1, createdAt: -1 }); // For fetching user's inbox sorted by date
inboxSchema.index({ recipientId: 1, isRead: 1 }); // For filtering read/unread messages

const Inbox = mongoose.models.inbox || mongoose.model<InboxMessageDocument>("inbox", inboxSchema);

export class InboxModel {
    private model: Model<InboxMessageDocument>;

    constructor() {
        this.model = Inbox;
    }

    async create(data: Omit<InboxMessageDocument, "_id" | "__v">): Promise<InboxMessageDocument> {
        const message = new this.model(data);
        return message.save();
    }

    async findByRecipientId(recipientId: string, limit: number = 50, skip: number = 0): Promise<InboxMessageDocument[]> {
        if (!mongoose.Types.ObjectId.isValid(recipientId)) {
            throw new Error("Invalid recipient ID");
        }

        return this.model
            .find({ recipientId: new mongoose.Types.ObjectId(recipientId) })
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .populate("senderId", "firstName lastName email")
            .exec();
    }

    async countByRecipientId(recipientId: string): Promise<number> {
        if (!mongoose.Types.ObjectId.isValid(recipientId)) {
            throw new Error("Invalid recipient ID");
        }

        return this.model.countDocuments({ recipientId: new mongoose.Types.ObjectId(recipientId) });
    }

    async countUnreadByRecipientId(recipientId: string): Promise<number> {
        if (!mongoose.Types.ObjectId.isValid(recipientId)) {
            throw new Error("Invalid recipient ID");
        }

        return this.model.countDocuments({
            recipientId: new mongoose.Types.ObjectId(recipientId),
            isRead: false,
        });
    }

    async markAsRead(messageId: string): Promise<InboxMessageDocument | null> {
        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            throw new Error("Invalid message ID");
        }

        return this.model.findByIdAndUpdate(
            messageId,
            { isRead: true },
            { new: true }
        );
    }

    async markAllAsRead(recipientId: string): Promise<any> {
        if (!mongoose.Types.ObjectId.isValid(recipientId)) {
            throw new Error("Invalid recipient ID");
        }

        return this.model.updateMany(
            { recipientId: new mongoose.Types.ObjectId(recipientId), isRead: false },
            { isRead: true }
        );
    }

    async deleteMessage(messageId: string): Promise<any> {
        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            throw new Error("Invalid message ID");
        }

        return this.model.findByIdAndDelete(messageId);
    }

    async deleteOlderMessages(recipientId: string, daysOld: number = 30): Promise<any> {
        if (!mongoose.Types.ObjectId.isValid(recipientId)) {
            throw new Error("Invalid recipient ID");
        }

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        return this.model.deleteMany({
            recipientId: new mongoose.Types.ObjectId(recipientId),
            createdAt: { $lt: cutoffDate },
        });
    }
}
