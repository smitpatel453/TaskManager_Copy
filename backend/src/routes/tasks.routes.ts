import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { TasksController } from "../controllers/tasks.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();
const tasksController = new TasksController();

/**
 * Admin middleware to verify user has admin role
 */
async function adminMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        const db = mongoose.connection.db;
        if (!db) {
            res.status(500).json({ error: "Database connection failed" });
            return;
        }

        // Find user and check role
        const user = await db.collection("users").findOne({ _id: new mongoose.Types.ObjectId(userId) });
        if (!user) {
            res.status(404).json({ error: "User not found" });
            return;
        }

        // Check if user has admin role (role is stored as string in user model)
        if (user.role !== "admin") {
            res.status(403).json({ error: "Admin access required" });
            return;
        }

        next();
    } catch (error) {
        console.error("Admin middleware error:", error);
        res.status(500).json({ error: "Server error" });
    }
}

router.use(authMiddleware);
router.post("/", (req, res) => tasksController.createTask(req, res));
router.get("/", (req, res) => tasksController.getTasks(req, res));
router.get("/:id/details", (req, res) => tasksController.getTaskDetails(req, res));
router.put("/:id/details/:index", (req, res) => tasksController.updateTaskDetail(req, res));
router.patch("/:id/status", (req, res) => tasksController.updateTaskStatus(req, res));
router.patch("/:id", adminMiddleware, (req, res) => tasksController.updateTask(req, res));
router.delete("/:id", adminMiddleware, (req, res) => tasksController.deleteTask(req, res));
export default router;
