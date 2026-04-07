import mongoose from "mongoose";
import { InboxModel, NotificationType, TaskStatusNotificationType } from "../models/inbox.model.js";
import { EmailService } from "./email.service.js";

export class InboxService {
    private inboxModel: InboxModel;
    private emailService: EmailService;

    constructor() {
        this.inboxModel = new InboxModel();
        this.emailService = new EmailService();
    }

    /**
     * Create a task assignment notification
     * Called when admin assigns a task to a user
     */
    async notifyTaskAssigned(
        taskId: string,
        taskName: string,
        assignedToUserId: string,
        assignedByUserId: string
    ): Promise<void> {
        try {
            const db = mongoose.connection.db;
            if (!db) {
                throw new Error("Database connection failed");
            }

            // Fetch user details for personalization
            const assignedUser = await db
                .collection("users")
                .findOne({ _id: new mongoose.Types.ObjectId(assignedToUserId) });
            const assignedByUser = await db
                .collection("users")
                .findOne({ _id: new mongoose.Types.ObjectId(assignedByUserId) });

            if (!assignedUser) {
                throw new Error("Assigned user not found");
            }

            const senderName = assignedByUser ? `${assignedByUser.firstName} ${assignedByUser.lastName}` : "Admin";

            // Create inbox notification
            await this.inboxModel.create({
                recipientId: new mongoose.Types.ObjectId(assignedToUserId),
                senderId: new mongoose.Types.ObjectId(assignedByUserId),
                taskId: new mongoose.Types.ObjectId(taskId),
                taskName,
                type: "task-assigned",
                title: "Task Assigned",
                message: `${senderName} has assigned you the task "${taskName}"`,
                isRead: false,
                createdAt: new Date(),
            });

            // Send email notification
            await this.emailService.sendTaskAssignmentNotification(
                assignedUser.email,
                `${assignedUser.firstName} ${assignedUser.lastName}`,
                taskName,
                senderName
            );
        } catch (error) {
            console.error("Error notifying task assignment:", error);
            // Don't throw - we don't want to fail task creation if notification fails
        }
    }

    /**
     * Create a task status change notification
     * Called when a user changes a task status
     */
    async notifyTaskStatusChanged(
        taskId: string,
        taskName: string,
        statusChangedByUserId: string,
        newStatus: TaskStatusNotificationType,
        previousStatus?: TaskStatusNotificationType,
        taskAssignedToUserId?: string,
        taskCreatedByUserId?: string
    ): Promise<void> {
        try {
            const db = mongoose.connection.db;
            if (!db) {
                throw new Error("Database connection failed");
            }

            const statusChangedByUser = await db
                .collection("users")
                .findOne({ _id: new mongoose.Types.ObjectId(statusChangedByUserId) });

            if (!statusChangedByUser) {
                throw new Error("Status changed by user not found");
            }

            const changerName = `${statusChangedByUser.firstName} ${statusChangedByUser.lastName}`;

            // Determine who should receive the notification
            let notificationRecipientId: string | null = null;

            // If status was changed by the assigned user, notify the creator/admin
            if (taskAssignedToUserId && statusChangedByUserId === taskAssignedToUserId && taskCreatedByUserId) {
                notificationRecipientId = taskCreatedByUserId;
            }
            // If status was changed by someone else (admin/creator), notify the assigned user
            else if (taskAssignedToUserId && statusChangedByUserId !== taskAssignedToUserId) {
                notificationRecipientId = taskAssignedToUserId;
            }

            if (!notificationRecipientId) {
                return; // No one to notify
            }

            const recipient = await db
                .collection("users")
                .findOne({ _id: new mongoose.Types.ObjectId(notificationRecipientId) });

            if (!recipient) {
                throw new Error("Notification recipient not found");
            }

            const statusText = newStatus === "in-progress" ? "In Progress" : newStatus.charAt(0).toUpperCase() + newStatus.slice(1);

            // Create inbox notification
            await this.inboxModel.create({
                recipientId: new mongoose.Types.ObjectId(notificationRecipientId),
                senderId: new mongoose.Types.ObjectId(statusChangedByUserId),
                taskId: new mongoose.Types.ObjectId(taskId),
                taskName,
                type: "task-status-changed",
                title: "Task Status Changed",
                message: `${changerName} changed the task "${taskName}" status to ${statusText}`,
                previousStatus,
                newStatus,
                isRead: false,
                createdAt: new Date(),
            });

            // Send email notification
            await this.emailService.sendTaskStatusChangeNotification(
                recipient.email,
                `${recipient.firstName} ${recipient.lastName}`,
                taskName,
                changerName,
                statusText,
                previousStatus ? this.formatStatus(previousStatus) : undefined
            );
        } catch (error) {
            console.error("Error notifying task status change:", error);
            // Don't throw - we don't want to fail status update if notification fails
        }
    }

    /**
     * Get inbox messages for a user
     */
    async getInboxMessages(
        recipientId: string,
        limit: number = 50,
        skip: number = 0
    ): Promise<any> {
        const messages = await this.inboxModel.findByRecipientId(recipientId, limit, skip);
        const total = await this.inboxModel.countByRecipientId(recipientId);
        const unreadCount = await this.inboxModel.countUnreadByRecipientId(recipientId);

        return {
            messages,
            total,
            unreadCount,
            skip,
            limit,
        };
    }

    /**
     * Mark a single message as read
     */
    async markMessageAsRead(messageId: string): Promise<any> {
        return await this.inboxModel.markAsRead(messageId);
    }

    /**
     * Mark all messages as read for a user
     */
    async markAllMessagesAsRead(recipientId: string): Promise<any> {
        return await this.inboxModel.markAllAsRead(recipientId);
    }

    /**
     * Delete a message
     */
    async deleteMessage(messageId: string): Promise<any> {
        return await this.inboxModel.deleteMessage(messageId);
    }

    /**
     * Get unread count for a user
     */
    async getUnreadCount(recipientId: string): Promise<number> {
        return await this.inboxModel.countUnreadByRecipientId(recipientId);
    }

    private formatStatus(status: TaskStatusNotificationType): string {
        if (status === "in-progress") return "In Progress";
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
}
