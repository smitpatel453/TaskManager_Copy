import { Request, Response } from "express";
import { UsersService } from "../services/users.service.js";
import type { CreateUserRequest } from "../shared/types/index.js";

// Helper function to validate password strength
function isStrongPassword(password: string): boolean {
    // At least 8 characters, 1 uppercase, 1 lowercase, 1 digit, 1 special char
    const hasLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    return hasLength && hasUppercase && hasLowercase && hasDigit && hasSpecial;
}

// Helper function to validate email format
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export class UsersController {
    private usersService: UsersService;

    constructor() {
        this.usersService = new UsersService();
    }

    /**
     * Create a new user (admin only)
     */
    async createUser(req: Request, res: Response): Promise<void> {
        try {
            const adminId = req.user?.userId;
            if (!adminId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const body = req.body as Partial<CreateUserRequest>;

            // Validate required fields
            if (!body.firstName || typeof body.firstName !== "string") {
                res.status(400).json({ error: "firstName is required and must be a string" });
                return;
            }

            if (!body.lastName || typeof body.lastName !== "string") {
                res.status(400).json({ error: "lastName is required and must be a string" });
                return;
            }

            if (!body.email || typeof body.email !== "string") {
                res.status(400).json({ error: "email is required and must be a string" });
                return;
            }

            if (!isValidEmail(body.email)) {
                res.status(400).json({ error: "email must be a valid email address" });
                return;
            }

            if (!body.password || typeof body.password !== "string") {
                res.status(400).json({ error: "password is required and must be a string" });
                return;
            }

            if (!isStrongPassword(body.password)) {
                res.status(400).json({ error: "password must be at least 8 characters and include uppercase, lowercase, number, and special character" });
                return;
            }

            if (body.role && !["admin", "user"].includes(body.role)) {
                res.status(400).json({ error: "role must be either 'admin' or 'user'" });
                return;
            }

            const result = await this.usersService.createUser(body as CreateUserRequest, adminId);
            res.status(201).json(result);
        } catch (error) {
            console.error("Create user error:", error);
            if (error instanceof Error) {
                if (error.message.includes("admin")) {
                    res.status(403).json({ error: error.message });
                } else {
                    res.status(400).json({ error: error.message });
                }
            } else {
                res.status(500).json({ error: "Server error" });
            }
        }
    }

    /**
     * Get all users (admin only)
     */
    async getAllUsers(req: Request, res: Response): Promise<void> {
        try {
            const adminId = req.user?.userId;
            if (!adminId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            let page = parseInt(req.query.page as string) || 1;
            let limit = parseInt(req.query.limit as string) || 10;
            
            // Validate and coerce pagination values
            page = Math.max(1, page);
            limit = Math.max(1, Math.min(limit, 100)); // Clamp between 1 and 100

            const result = await this.usersService.getAllUsers(adminId, page, limit);
            res.json(result);
        } catch (error) {
            console.error("Get all users error:", error);
            if (error instanceof Error) {
                if (error.message.includes("admin")) {
                    res.status(403).json({ error: error.message });
                } else {
                    res.status(400).json({ error: error.message });
                }
            } else {
                res.status(500).json({ error: "Server error" });
            }
        }
    }

    /**
     * Delete a user (admin only)
     */
    async deleteUser(req: Request, res: Response): Promise<void> {
        try {
            const adminId = req.user?.userId;
            if (!adminId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const { id } = req.params;
            if (!id) {
                res.status(400).json({ error: "User ID is required" });
                return;
            }

            const result = await this.usersService.deleteUser(id, adminId);
            res.json(result);
        } catch (error) {
            console.error("Delete user error:", error);
            if (error instanceof Error) {
                if (error.message.includes("admin")) {
                    res.status(403).json({ error: error.message });
                } else if (error.message.includes("not found")) {
                    res.status(404).json({ error: error.message });
                } else {
                    res.status(400).json({ error: error.message });
                }
            } else {
                res.status(500).json({ error: "Server error" });
            }
        }
    }
}
