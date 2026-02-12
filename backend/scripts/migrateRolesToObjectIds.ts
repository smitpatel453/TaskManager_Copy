import mongoose from "mongoose";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
const envPath = path.resolve(__dirname, "../. env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

async function migrateRolesToObjectIds() {
  try {
    console.log("Connecting to MongoDB...");
    const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/mydb";
    await mongoose.connect(mongoUri);
    console.log("✓ Connected to MongoDB");

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection failed");
    }

    const usersCollection = db.collection("users");
    const rolesCollection = db.collection("roles");

    // Get the admin role ObjectId
    const adminRole = await rolesCollection.findOne({ name: "admin" });
    if (!adminRole) {
      console.log("✗ Admin role not found in roles collection");
      await mongoose.connection.close();
      process.exit(1);
      return;
    }

    console.log(`\nFound Admin Role ID: ${adminRole._id}`);

    // Find users with string "admin" role
    const adminUsers = await usersCollection.find({ role: "admin" }).toArray();
    
    if (adminUsers.length === 0) {
      console.log("✓ No users with string 'admin' role found - already migrated!");
      await mongoose.connection.close();
      return;
    }

    console.log(`\nFound ${adminUsers.length} user(s) with string 'admin' role`);
    // Only log user count to avoid PII

    // Update all users with string "admin" role to use ObjectId
    const result = await usersCollection.updateMany(
      { role: "admin" },
      { $set: { role: adminRole._id } }
    );

    console.log(`\n✓ Updated ${result.modifiedCount} user(s) to use admin role ObjectId`);

    // Verify the migration
    const migratedUsers = await usersCollection.find({ role: adminRole._id }).toArray();
    console.log(`\n✓ Verification: ${migratedUsers.length} users now have admin role ObjectId`);

    await mongoose.connection.close();
  } catch (error) {
    console.error("✗ Error:", error instanceof Error ? error.message : String(error));
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the migration
migrateRolesToObjectIds();
