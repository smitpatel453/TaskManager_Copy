import { Request, Response } from "express";
import { InboxService } from "../services/inbox.service.js";

export class InboxController {
  private inboxService: InboxService;

  constructor() {
    this.inboxService = new InboxService();
  }

  /**
   * Get inbox messages for the authenticated user
   */
  async getInboxMessages(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
      const skip = parseInt(req.query.skip as string) || 0;

      const result = await this.inboxService.getInboxMessages(userId, limit, skip);
      res.json(result);
    } catch (error) {
      console.error("Error fetching inbox messages:", error);
      res.status(500).json({ error: "Failed to fetch inbox messages" });
    }
  }

  /**
   * Mark a single message as read
   */
  async markMessageAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { messageId } = req.params;
      if (!messageId) {
        res.status(400).json({ error: "messageId is required" });
        return;
      }

      const message = await this.inboxService.markMessageAsRead(messageId);
      if (!message || message.recipientId.toString() !== userId) {
        res.status(403).json({ error: "Access denied" });
        return;
      }

      res.json({ success: true, message: "Message marked as read" });
    } catch (error) {
      console.error("Error marking message as read:", error);
      res.status(500).json({ error: "Failed to mark message as read" });
    }
  }

  /**
   * Mark all messages as read for the authenticated user
   */
  async markAllMessagesAsRead(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      await this.inboxService.markAllMessagesAsRead(userId);
      res.json({ success: true, message: "All messages marked as read" });
    } catch (error) {
      console.error("Error marking all messages as read:", error);
      res.status(500).json({ error: "Failed to mark all messages as read" });
    }
  }

  /**
   * Delete a message
   */
  async deleteMessage(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const { messageId } = req.params;
      if (!messageId) {
        res.status(400).json({ error: "messageId is required" });
        return;
      }

      // Verify the message belongs to the user
      const inboxService = new InboxService();
      const messages = await inboxService.getInboxMessages(userId, 1, 0);
      const message = messages.messages.find((m: any) => m._id.toString() === messageId);

      if (!message) {
        res.status(403).json({ error: "Access denied or message not found" });
        return;
      }

      await inboxService.deleteMessage(messageId);
      res.json({ success: true, message: "Message deleted" });
    } catch (error) {
      console.error("Error deleting message:", error);
      res.status(500).json({ error: "Failed to delete message" });
    }
  }

  /**
   * Get unread count for the authenticated user
   */
  async getUnreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const unreadCount = await this.inboxService.getUnreadCount(userId);
      res.json({ unreadCount });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  }
}
