import { createApp } from "./app.js";
import { ENV } from "./config/env.js";
import connectDB from "./infrastructure/database/mongodb.js";
import { createServer } from "http";
import { initializeSocket } from "./infrastructure/socket.js";
import { startCallMonitor } from "./services/callMonitor.service.js";
import { startMaintenanceService } from "./services/maintenance.service.js";
import { startSlackImportWorker } from "./workers/slackImport.worker.js";

// Connect to MongoDB
connectDB()
  .then(() => {
    console.log(`✅ Connected to MongoDB - Database: ${ENV.DB_NAME}`);

    const app = createApp();
    const httpServer = createServer(app);
    initializeSocket(httpServer);

    httpServer.listen(ENV.PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${ENV.PORT}`);
      console.log(`📝 Environment: ${ENV.NODE_ENV}`);

      // Start call duration monitor
      startCallMonitor();

      // Start maintenance service (cleanup old call history)
      startMaintenanceService();

      // Start the BullMQ Slack Import Background Worker
      startSlackImportWorker();
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  });
