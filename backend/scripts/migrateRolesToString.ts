/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  TaskManager — Role Migration Script
 *  Usage:  npx ts-node --esm scripts/migrateRolesToString.ts
 *
 *  What it does:
 *  Converts all user roles from ObjectId references to string values 
 *  ("admin" or "user") to match the updated user schema.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// ─── Load env ────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "mydb";

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not set in .env");
  process.exit(1);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const log = {
  info: (msg: string) => console.log(`  ℹ  ${msg}`),
  success: (msg: string) => console.log(`  ✅ ${msg}`),
  error: (msg: string) => console.error(`  ❌ ${msg}`),
  header: (msg: string) => console.log(`\n${"─".repeat(60)}\n  ${msg}\n${"─".repeat(60)}`),
};

// ─── Main migration function ─────────────────────────────────────────────────
async function migrateRolesToString(db: mongoose.mongo.Db) {
  log.header("Migrating User Roles to String Format");

  const usersCollection = db.collection("users");
  const rolesCollection = db.collection("roles");

  // Fetch role mappings (ObjectId → name)
  const adminRole = await rolesCollection.findOne({ name: "admin" });
  const userRole = await rolesCollection.findOne({ name: "user" });

  const roleMap: Record<string, string> = {};
  if (adminRole) roleMap[adminRole._id.toString()] = "admin";
  if (userRole) roleMap[userRole._id.toString()] = "user";

  log.info(`Found role mappings: ${JSON.stringify(roleMap)}`);

  // Check for users with ObjectId roles
  const usersWithObjectIdRoles = await usersCollection
    .find({ role: { $type: "objectId" } })
    .toArray();

  if (usersWithObjectIdRoles.length === 0) {
    log.success("No users with ObjectId roles found. Migration not needed.");
    return;
  }

  log.info(`Found ${usersWithObjectIdRoles.length} users with ObjectId roles.`);

  // Migrate each user
  let migratedCount = 0;
  for (const user of usersWithObjectIdRoles) {
    const roleId = user.role?.toString();
    const roleName = roleMap[roleId] || "user";

    const result = await usersCollection.updateOne(
      { _id: user._id },
      { $set: { role: roleName, updatedAt: new Date() } }
    );

    if (result.modifiedCount > 0) {
      log.success(`Migrated user "${user.email}" to role "${roleName}"`);
      migratedCount++;
    } else {
      log.error(`Failed to migrate user "${user.email}"`);
    }
  }

  log.header("Migration Complete");
  log.success(`Successfully migrated ${migratedCount} users`);

  // Show updated users
  const allUsers = await usersCollection
    .find({})
    .project({ firstName: 1, lastName: 1, email: 1, role: 1 })
    .limit(10)
    .toArray();

  console.log("\n  Sample of migrated users:");
  allUsers.forEach((u: any) => {
    console.log(`    • ${u.email.padEnd(36)} role: ${u.role || "user"}`);
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   TaskManager  —  Role Migration Script                  ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  let conn: mongoose.Connection | null = null;

  try {
    // Connect to MongoDB
    console.log(`Connecting to MongoDB: ${MONGODB_URI.split("@")[1] || "..."}`);
    const mongooseInstance = await mongoose.connect(MONGODB_URI, {
      dbName: DB_NAME,
    });

    conn = mongooseInstance.connection;
    log.success("Connected to MongoDB");

    const db = conn.db;
    if (!db) {
      throw new Error("Failed to get database instance");
    }

    // Run migration
    await migrateRolesToString(db);

    log.success("All done! 🎉");
  } catch (error) {
    if (error instanceof Error) {
      log.error(`${error.message}`);
    } else {
      log.error("Unknown error occurred");
    }
    process.exit(1);
  } finally {
    if (conn) {
      await conn.close();
      log.info("Disconnected from MongoDB");
    }
  }
}

main();
