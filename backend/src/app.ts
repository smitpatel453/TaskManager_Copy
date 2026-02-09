import express from "express";
import cors from "cors";
import { CORS_CONFIG } from "./middlewares/cors";
import authRoutes from "./routes/auth.routes";
import tasksRoutes from "./routes/tasks.routes";

export function createApp() {
  const app = express();
  // Middleware
  app.use(cors(CORS_CONFIG));
  app.use(express.json());
  // Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/tasks", tasksRoutes);
  // Error handling middleware
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  });
  return app;
}
