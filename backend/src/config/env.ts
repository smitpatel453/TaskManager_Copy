import dotenv from "dotenv";

dotenv.config({ path: ".env" });

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3001", 10),
  MONGODB_URI: process.env.MONGODB_URI,
  DB_NAME: process.env.DB_NAME || "mydb",
  JWT_SECRET: process.env.JWT_SECRET || "awXwNFpMPDdMCjk4eYEi5OdjGHSf7TS/2jMtH3EgfN0=",
  EMAIL_NOTIFICATIONS_ENABLED: (process.env.EMAIL_NOTIFICATIONS_ENABLED || "false").toLowerCase() === "true",
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : undefined,
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  SMTP_FROM: process.env.SMTP_FROM,
  SMTP_SECURE: (process.env.SMTP_SECURE || "false").toLowerCase() === "true",
};

// Validate required env vars
if (!ENV.MONGODB_URI) {
  throw new Error("Missing MONGODB_URI in environment variables");
}
