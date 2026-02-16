import { Request, Response } from "express";
import { DashboardService } from "../services/dashboard.service.js";

export class DashboardController {
  private dashboardService: DashboardService;

  constructor(dashboardService?: DashboardService) {
    this.dashboardService = dashboardService || new DashboardService();
    this.getStats = this.getStats.bind(this);
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
      const stats = await this.dashboardService.getStats(userId, projectId);
      res.json(stats);
    } catch (error) {
      console.error("Get dashboard stats error:", error);
      res.status(500).json({ error: "Server error" });
    }
  }
}
