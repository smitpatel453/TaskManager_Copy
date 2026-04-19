import { Router } from "express";
import { InboxController } from "../controllers/inbox.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();
const inboxController = new InboxController();

router.use(authMiddleware);

// Get inbox messages
router.get("/", (req, res) => inboxController.getInboxMessages(req, res));

// Get unread count
router.get("/unread/count", (req, res) => inboxController.getUnreadCount(req, res));

// Mark a single message as read
router.patch("/:messageId/read", (req, res) => inboxController.markMessageAsRead(req, res));

// Mark all messages as read
router.patch("/read/all", (req, res) => inboxController.markAllMessagesAsRead(req, res));

// Add a reply to a notification
router.post("/:messageId/reply", (req, res) => inboxController.addReply(req, res));

// Create a mention notification
router.post("/mention/create", (req, res) => inboxController.createMention(req, res));

// Delete a message
router.delete("/:messageId", (req, res) => inboxController.deleteMessage(req, res));

export default router;
