import dotenv from "dotenv";

dotenv.config({ path: ".env" });

// Validate required env vars early so the rest of the app gets properly typed values
if (!process.env.MONGODB_URI) {
  throw new Error("Missing MONGODB_URI in environment variables");
}

if (!process.env.JWT_SECRET) {
  throw new Error("Missing JWT_SECRET in environment variables");
}

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3001", 10),
  MONGODB_URI: process.env.MONGODB_URI,
  DB_NAME: process.env.DB_NAME || "mydb",
  JWT_SECRET: process.env.JWT_SECRET,
  FRONTEND_URL: process.env.FRONTEND_URL,
  EMAIL_NOTIFICATIONS_ENABLED: (process.env.EMAIL_NOTIFICATIONS_ENABLED || "false").toLowerCase() === "true",
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM,
  SMTP_SECURE: (process.env.SMTP_SECURE || "false").toLowerCase() === "true",
  LIVEKIT_URL: process.env.LIVEKIT_URL || "http://localhost:7880",
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY || "devkey",
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET || "secret",
  MAX_CALL_DURATION_MINUTES: parseInt(process.env.MAX_CALL_DURATION_MINUTES || "120", 10),
  CALL_WARNING_THRESHOLD_MINUTES: parseInt(process.env.CALL_WARNING_THRESHOLD_MINUTES || "110", 10),
};
