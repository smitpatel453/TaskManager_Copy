import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { UsersController } from "../controllers/users.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = Router();
const usersController = new UsersController();

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
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            res.status(400).json({ error: "Invalid user ID" });
            return;
        }
        
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

// Apply auth middleware to all routes
router.use(authMiddleware);

// Search users by email (for adding team members)
router.get("/search", async (req, res, next) => {
    try {
        await usersController.searchUsers(req, res);
    } catch (error) {
        next(error);
    }
});

// User self-update profile
router.patch("/profile", async (req, res, next) => {
    try {
        await usersController.updateProfile(req, res);
    } catch (error) {
        next(error);
    }
});

// Admin only routes
router.post("/", adminMiddleware, async (req, res, next) => {
    try {
        await usersController.createUser(req, res);
    } catch (error) {
        next(error);
    }
});
router.get("/", adminMiddleware, async (req, res, next) => {
    try {
        await usersController.getAllUsers(req, res);
    } catch (error) {
        next(error);
    }
});
router.delete("/:id", adminMiddleware, async (req, res, next) => {
    try {
        await usersController.deleteUser(req, res);
    } catch (error) {
        next(error);
    }
});

export default router;
