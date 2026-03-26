import { Request, Response } from "express";
import { ProjectsService } from "../services/projects.service.js";
import type { CreateProjectRequest } from "../shared/types/index.js";

export class ProjectsController {
    private projectsService: ProjectsService;

    constructor() {
        this.projectsService = new ProjectsService();
    }

    /**
     * Create a new project
     */
    async createProject(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const body = req.body as Partial<CreateProjectRequest>;

            // Validate project name
            if (!body.projectName || typeof body.projectName !== "string") {
                res.status(400).json({ error: "projectName is required and must be a string" });
                return;
            }

            // Validate project description
            if (!body.projectDescription || typeof body.projectDescription !== "string") {
                res.status(400).json({ error: "projectDescription is required and must be a string" });
                return;
            }

            // Validate assigned users
            if (!Array.isArray(body.assignedUsers)) {
                res.status(400).json({ error: "assignedUsers must be an array of user IDs" });
                return;
            }

            if (!body.teamId || typeof body.teamId !== "string") {
                res.status(400).json({ error: "teamId is required and must be a string" });
                return;
            }

            // Validate each user ID is a non-empty string
            if (!body.assignedUsers.every(u => typeof u === 'string' && u.trim().length > 0)) {
                res.status(400).json({ error: "assignedUsers must be an array of non-empty string user IDs" });
                return;
            }

            const result = await this.projectsService.createProject(body as CreateProjectRequest, userId);
            res.status(201).json(result);
        } catch (error) {
            console.error("Create project error:", error);
            if (error instanceof Error) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: "Server error" });
            }
        }
    }

    /**
     * Get all projects (admin only)
     */
    async getAllProjects(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const result = await this.projectsService.getAllProjects(userId);
            res.json(result);
        } catch (error) {
            console.error("Get all projects error:", error);
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
     * Get projects assigned to the current user
     */
    async getUserProjects(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const result = await this.projectsService.getProjectsByUser(userId);
            res.json(result);
        } catch (error) {
            console.error("Get user projects error:", error);
            if (error instanceof Error) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: "Server error" });
            }
        }
    }

    /**
     * Get all available users for assignment dropdown
     */
    async getAllUsers(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const result = await this.projectsService.getAllUsers();
            res.json(result);
        } catch (error) {
            console.error("Get all users error:", error);
            if (error instanceof Error) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: "Server error" });
            }
        }
    }
}

