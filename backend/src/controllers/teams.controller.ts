import { Request, Response } from "express";
import { TeamsService } from "../services/teams.service.js";

export class TeamsController {
    private teamsService: TeamsService;

    constructor() {
        this.teamsService = new TeamsService();
    }

    async createTeam(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const result = await this.teamsService.createTeam(req.body, userId);
            res.status(201).json(result);
        } catch (error) {
            console.error("Create team error:", error);
            if (error instanceof Error) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: "Server error" });
            }
        }
    }

    async getTeams(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            const result = await this.teamsService.getVisibleTeams(userId);
            res.status(200).json(result);
        } catch (error) {
            console.error("Get teams error:", error);
            if (error instanceof Error) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: "Server error" });
            }
        }
    }
}
