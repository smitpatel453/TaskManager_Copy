import mongoose from "mongoose";
import { ENV } from "../../config/env";

const uri = ENV.MONGODB_URI;
if (!uri) throw new Error("Missing MONGODB_URI in environment variables");

declare global {
  var mongooseCache: {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  } | undefined;
}

let cached = global.mongooseCache || { conn: null, promise: null };
global.mongooseCache = cached;

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      dbName: ENV.DB_NAME,
    };

    cached.promise = mongoose.connect(uri!, opts);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectDB;
