import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { ProjectsController } from "../controllers/projects.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();
const projectsController = new ProjectsController();

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

        // Check if user has admin role
        if (!user.role) {
            res.status(403).json({ error: "Admin access required" });
            return;
        }

        const adminRole = await db.collection("roles").findOne({ name: "admin" });
        if (!adminRole || user.role.toString() !== adminRole._id.toString()) {
            res.status(403).json({ error: "Admin access required" });
            return;
        }

        next();
    } catch (error) {
        console.error("Admin middleware error:", error);
        res.status(500).json({ error: "Server error" });
    }
}

// Apply auth middleware to all routes
router.use(authMiddleware);

// Public routes (all authenticated users)
router.get("/users/all", (req, res) => projectsController.getAllUsers(req, res));
router.get("/my-projects", (req, res) => projectsController.getUserProjects(req, res));

// Team member/admin create route
router.post("/", (req, res) => projectsController.createProject(req, res));

// Admin only routes
router.get("/", adminMiddleware, (req, res) => projectsController.getAllProjects(req, res));

export default router;

