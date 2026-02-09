import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import type { LoginRequest } from "../shared/types";

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  async register(req: Request, res: Response): Promise<void> {
    try {
      const body = req.body as LoginRequest;
      const result = await this.authService.register(body);
      res.status(201).json(result);
    } catch (error) {
      console.error("Auth register error:", error);
      if (error instanceof Error && error.message.includes("already exists")) {
        res.status(400).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Server error" });
      }
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      
      const body = req.body as { email: string; password: string };
      // console.log(req)
      // console.log(body)
      const result = await this.authService.login(body.email, body.password);
      res.status(200).json(result);
    } catch (error) {
      console.error("Auth login error:", error);
      if (error instanceof Error && (error.message.includes("not found") || error.message.includes("Invalid password"))) {
        res.status(401).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Server error" });
      }
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req.user as any)?.userId;
      if (!userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const body = req.body as { currentPassword?: string; newPassword?: string; confirmPassword?: string };

      // Validate required fields
      if (!body.currentPassword || typeof body.currentPassword !== "string") {
        res.status(400).json({ error: "Current password is required" });
        return;
      }

      if (!body.newPassword || typeof body.newPassword !== "string") {
        res.status(400).json({ error: "New password is required" });
        return;
      }

      if (!body.confirmPassword || typeof body.confirmPassword !== "string") {
        res.status(400).json({ error: "Confirm password is required" });
        return;
      }

      // Validate password length
      if (body.newPassword.length < 6) {
        res.status(400).json({ error: "New password must be at least 6 characters" });
        return;
      }

      // Validate passwords match
      if (body.newPassword !== body.confirmPassword) {
        res.status(400).json({ error: "New password and confirm password do not match" });
        return;
      }

      const result = await this.authService.changePassword(userId, body.currentPassword, body.newPassword);
      res.status(200).json(result);
    } catch (error) {
      console.error("Auth changePassword error:", error);
      if (error instanceof Error && error.message.includes("incorrec")) {
        res.status(401).json({ error: error.message });
      } else if (error instanceof Error && error.message.includes("not found")) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: "Server error" });
      }
    }
  }
}
