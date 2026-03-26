import mongoose from "mongoose";
import bcrypt from "bcrypt";
import * as dotenv from "dotenv";
dotenv.config();

const URI = process.env.MONGODB_URI!;
const DB = process.env.DB_NAME || "taskmanager";

await mongoose.connect(URI, { dbName: DB });
const db = mongoose.connection.db!;

const user = await db.collection("users").findOne({ email: "admin@taskmanager.com" });
if (!user) {
  console.log("USER NOT FOUND");
  const all = await db.collection("users").find({}).project({ email: 1 }).toArray();
  console.log("All emails in DB:", all.map((u: any) => u.email).join(", ") || "(none)");
} else {
  console.log("hash prefix:", user.password.substring(0, 10));
  const match = await bcrypt.compare("Admin@123", user.password);
  console.log("bcrypt Admin@123 match:", match);
}

await mongoose.disconnect();
