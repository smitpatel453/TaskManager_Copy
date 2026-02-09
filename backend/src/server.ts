import { createApp } from "./app";
import { ENV } from "./config/env";
import connectDB from "./infrastructure/database/mongodb";

// Connect to MongoDB
connectDB()
  .then(() => {
    console.log(`✅ Connected to MongoDB - Database: ${ENV.DB_NAME}`);
    
    const app = createApp();

    app.listen(ENV.PORT, () => {
      console.log(`🚀 Server running on http://localhost:${ENV.PORT}`);
      console.log(`📝 Environment: ${ENV.NODE_ENV}`);
    });
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  });
