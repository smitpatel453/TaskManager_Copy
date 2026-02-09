import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT || "3001", 10),
  MONGODB_URI: process.env.MONGODB_URI,
  DB_NAME: process.env.DB_NAME || "mydb",
  JWT_SECRET: process.env.JWT_SECRET || "awXwNFpMPDdMCjk4eYEi5OdjGHSf7TS/2jMtH3EgfN0=",
};

// Validate required env vars
if (!ENV.MONGODB_URI) {
  throw new Error("Missing MONGODB_URI in environment variables");
}
