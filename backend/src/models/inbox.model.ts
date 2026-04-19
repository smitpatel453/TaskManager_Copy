import mongoose, { Schema, Document, Model } from "mongoose";

export type NotificationType = "task-assigned" | "task-status-changed" | "mention" | "comment_reply";
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
    
    // For replies/comments
    replies?: {
        _id?: mongoose.Types.ObjectId;
        senderId: mongoose.Types.ObjectId;
        senderName: string;
        message: string;
        createdAt: Date;
    }[];
    
    // For mentions
    mentionedUsers?: string[]; // IDs of mentioned users
}

const inboxSchema = new Schema<InboxMessageDocument>(
    {
        recipientId: { type: Schema.Types.ObjectId, ref: "users", required: true, index: true },
        senderId: { type: Schema.Types.ObjectId, ref: "users" },
        taskId: { type: Schema.Types.ObjectId, ref: "tasks", required: true, index: true },
        taskName: { type: String, required: true },
        type: { type: String, enum: ["task-assigned", "task-status-changed", "mention", "comment_reply"], required: true },
        title: { type: String, required: true },
        message: { type: String, required: true },
        previousStatus: { type: String, enum: ["to-do", "in-progress", "completed"] },
        newStatus: { type: String, enum: ["to-do", "in-progress", "completed"] },
        isRead: { type: Boolean, default: false, index: true },
        createdAt: { type: Date, default: Date.now, index: true },
        
        // Replies to notifications
        replies: [{
            senderId: { type: Schema.Types.ObjectId, ref: "users" },
            senderName: { type: String },
            message: { type: String },
            createdAt: { type: Date, default: Date.now }
        }],
        
        // Mentioned users
        mentionedUsers: [{ type: Schema.Types.ObjectId, ref: "users" }]
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

    async findByRecipientId(recipientId: string, limit: number = 50, skip: number = 0, type?: string): Promise<InboxMessageDocument[]> {
        if (!mongoose.Types.ObjectId.isValid(recipientId)) {
            throw new Error("Invalid recipient ID");
        }

        const query: any = { recipientId: new mongoose.Types.ObjectId(recipientId) };
        
        // If type filter is provided, add it to query
        if (type && type !== "all") {
            if (type === "tasks") {
                // Show ONLY task-assigned and task-status-changed
                query.type = { $in: ["task-assigned", "task-status-changed"] };
            } else if (type === "mention") {
                // Show ONLY mentions
                query.type = "mention";
            } else if (type === "comment_reply") {
                // Show ONLY comment replies
                query.type = "comment_reply";
            }
        }

        return this.model
            .find(query)
            .sort({ createdAt: -1 })
            .limit(limit)
            .skip(skip)
            .populate("senderId", "firstName lastName email")
            .exec();
    }

    async countByRecipientId(recipientId: string, type?: string): Promise<number> {
        if (!mongoose.Types.ObjectId.isValid(recipientId)) {
            throw new Error("Invalid recipient ID");
        }

        const query: any = { recipientId: new mongoose.Types.ObjectId(recipientId) };
        
        // If type filter is provided, add it to query
        if (type && type !== "all") {
            if (type === "tasks") {
                // Count ONLY task-assigned and task-status-changed
                query.type = { $in: ["task-assigned", "task-status-changed"] };
            } else if (type === "mention") {
                // Count ONLY mentions
                query.type = "mention";
            } else if (type === "comment_reply") {
                // Count ONLY comment replies
                query.type = "comment_reply";
            }
        }

        return this.model.countDocuments(query);
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

    async findById(messageId: string): Promise<InboxMessageDocument | null> {
        if (!mongoose.Types.ObjectId.isValid(messageId)) {
            throw new Error("Invalid message ID");
        }

        return this.model.findById(messageId).populate("senderId", "firstName lastName email").exec();
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

    /**
     * Add a reply to a notification
     */
    async addReply(
        messageId: string,
        senderId: string,
        senderName: string,
        message: string
    ): Promise<InboxMessageDocument | null> {
        if (!mongoose.Types.ObjectId.isValid(messageId) || !mongoose.Types.ObjectId.isValid(senderId)) {
            throw new Error("Invalid IDs");
        }

        return this.model.findByIdAndUpdate(
            messageId,
            {
                $push: {
                    replies: {
                        senderId: new mongoose.Types.ObjectId(senderId),
                        senderName,
                        message,
                        createdAt: new Date()
                    }
                }
            },
            { new: true }
        );
    }

    /**
     * Create mention notification for a user
     */
    async createMentionNotification(
        mentionedUserId: string,
        taskId: string,
        taskName: string,
        mentionerName: string,
        mentionerUserId: string
    ): Promise<InboxMessageDocument> {
        if (!mongoose.Types.ObjectId.isValid(mentionedUserId) || !mongoose.Types.ObjectId.isValid(taskId)) {
            throw new Error("Invalid IDs");
        }

        const mentionNotification = new this.model({
            recipientId: new mongoose.Types.ObjectId(mentionedUserId),
            senderId: new mongoose.Types.ObjectId(mentionerUserId),
            taskId: new mongoose.Types.ObjectId(taskId),
            taskName,
            type: "mention",
            title: "You were mentioned",
            message: `${mentionerName} mentioned you in task "${taskName}"`,
            isRead: false,
            createdAt: new Date(),
        });
        return mentionNotification.save();
    }
}
