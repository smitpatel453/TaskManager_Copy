import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { CORS_CONFIG } from "./middlewares/cors.js";
import authRoutes from "./routes/auth.routes.js";
import tasksRoutes from "./routes/tasks.routes.js";
import projectsRoutes from "./routes/projects.routes.js";
import teamsRoutes from "./routes/teams.routes.js";
import usersRoutes from "./routes/users.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import channelsRoutes from "./routes/channels.routes.js";
import connectDB from "./infrastructure/database/mongodb.js";

const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_RATE_LIMIT_MAX = parseInt(process.env.AUTH_RATE_LIMIT_MAX || "20", 10);

const authRateLimiter = rateLimit({
  windowMs: AUTH_RATE_LIMIT_WINDOW_MS,
  max: AUTH_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

export function createApp() {
  const app = express();
  // Security headers
  app.use(helmet());
  // Middleware - CORS and body parser must come first
  app.use(cors(CORS_CONFIG));
  app.use(express.json());

  // Database connection middleware for serverless
  app.use(async (_req, _res, next) => {
    try {
      await connectDB();
      next();
    } catch (error) {
      console.error("Database connection error:", error);
      next(error);
    }
  });

  // Routes
  app.use("/api/auth", authRateLimiter, authRoutes);
  app.use("/api/tasks", tasksRoutes);
  app.use("/api/projects", projectsRoutes);
  app.use("/api/teams", teamsRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/channels", channelsRoutes);
  // Error handling middleware
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });
  return app;
}

// Export app instance for Vercel serverless deployment
const app = createApp();
export default app;
