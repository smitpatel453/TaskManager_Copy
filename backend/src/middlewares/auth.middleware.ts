import { Request, Response, NextFunction } from "express";
import { verifyToken, JWTPayload } from "../infrastructure/database/jwt";

// Extend Express Request type to include user info
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

/**
 * Authentication middleware that verifies JWT token from Authorization header
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authorization token is required. Please provide a valid Bearer token in the Authorization header." });
      return;
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.slice(7);

    // Verify token
    const payload = await verifyToken(token);

    if (!payload) {
      res.status(401).json({ error: "Invalid or expired token" });
      return;
    }

    // Attach user info to request
    req.user = payload;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
}
