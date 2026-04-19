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

    async getTeam(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            const teamId = req.params.id;

            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            if (!teamId) {
                res.status(400).json({ error: "Team ID is required" });
                return;
            }

            const result = await this.teamsService.getTeamById(teamId, userId);
            res.status(200).json(result);
        } catch (error) {
            console.error("Get team error:", error);
            if (error instanceof Error) {
                if (error.message === "Team not found") {
                    res.status(404).json({ error: error.message });
                } else if (error.message.includes("Access denied")) {
                    res.status(403).json({ error: error.message });
                } else {
                    res.status(400).json({ error: error.message });
                }
            } else {
                res.status(500).json({ error: "Server error" });
            }
        }
    }

    async updateTeam(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            const teamId = req.params.id;
            const { teamName, description, isPrivate } = req.body;

            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            if (!teamId) {
                res.status(400).json({ error: "Team ID is required" });
                return;
            }

            const result = await this.teamsService.updateTeam(teamId, userId, {
                teamName,
                description,
                isPrivate,
            });
            res.status(200).json(result);
        } catch (error) {
            console.error("Update team error:", error);
            if (error instanceof Error) {
                if (error.message === "Team not found") {
                    res.status(404).json({ error: error.message });
                } else if (error.message.includes("Only admin")) {
                    res.status(403).json({ error: error.message });
                } else {
                    res.status(400).json({ error: error.message });
                }
            } else {
                res.status(500).json({ error: "Server error" });
            }
        }
    }

    async deleteTeam(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            const teamId = req.params.id;

            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            if (!teamId) {
                res.status(400).json({ error: "Team ID is required" });
                return;
            }

            const result = await this.teamsService.deleteTeam(teamId, userId);
            res.status(200).json(result);
        } catch (error) {
            console.error("Delete team error:", error);
            if (error instanceof Error) {
                if (error.message === "Team not found") {
                    res.status(404).json({ error: error.message });
                } else if (error.message.includes("Only admin")) {
                    res.status(403).json({ error: error.message });
                } else {
                    res.status(400).json({ error: error.message });
                }
            } else {
                res.status(500).json({ error: "Server error" });
            }
        }
    }

    async addMember(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            const teamId = req.params.id;
            const { memberId } = req.body;

            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            if (!teamId || !memberId) {
                res.status(400).json({ error: "Team ID and member ID are required" });
                return;
            }

            const result = await this.teamsService.addMember(teamId, userId, memberId);
            res.status(200).json(result);
        } catch (error) {
            console.error("Add member error:", error);
            if (error instanceof Error) {
                if (error.message === "Team not found") {
                    res.status(404).json({ error: error.message });
                } else if (error.message.includes("Only admin")) {
                    res.status(403).json({ error: error.message });
                } else {
                    res.status(400).json({ error: error.message });
                }
            } else {
                res.status(500).json({ error: "Server error" });
            }
        }
    }

    async removeMember(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            const teamId = req.params.id;
            const memberId = req.params.memberId || req.body.memberId;

            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            if (!teamId || !memberId) {
                res.status(400).json({ error: "Team ID and member ID are required" });
                return;
            }

            const result = await this.teamsService.removeMember(teamId, userId, memberId);
            res.status(200).json(result);
        } catch (error) {
            console.error("Remove member error:", error);
            if (error instanceof Error) {
                if (error.message === "Team not found") {
                    res.status(404).json({ error: error.message });
                } else if (error.message.includes("Only admin")) {
                    res.status(403).json({ error: error.message });
                } else {
                    res.status(400).json({ error: error.message });
                }
            } else {
                res.status(500).json({ error: "Server error" });
            }
        }
    }

    async leaveTeam(req: Request, res: Response): Promise<void> {
        try {
            const userId = req.user?.userId;
            const teamId = req.params.id;

            if (!userId) {
                res.status(401).json({ error: "Unauthorized" });
                return;
            }

            if (!teamId) {
                res.status(400).json({ error: "Team ID is required" });
                return;
            }

            const result = await this.teamsService.leaveTeam(teamId, userId);
            res.status(200).json(result);
        } catch (error) {
            console.error("Leave team error:", error);
            if (error instanceof Error) {
                if (error.message === "Team not found") {
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
