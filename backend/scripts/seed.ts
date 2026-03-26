/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  TaskManager — Database Seed Script
 *  Usage:  npx ts-node --esm scripts/seed.ts
 *          (or)  ts-node scripts/seed.ts
 *
 *  What it does:
 *  1.  Creates the "admin" and "user" roles in the `roles` collection
 *      (skips if they already exist — safe to run multiple times).
 *  2.  Creates an initial admin user (skips if email already exists).
 *  3.  Optionally creates extra regular users from EXTRA_USERS array.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import mongoose from "mongoose";
import bcrypt from "bcrypt";
import * as dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

// ─── Load env ────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const MONGODB_URI = process.env.MONGODB_URI;
const DB_NAME = process.env.DB_NAME || "mydb";   // must match env.ts default

if (!MONGODB_URI) {
  console.error("❌  MONGODB_URI is not set in .env");
  process.exit(1);
}

// ─── Seed Configuration ───────────────────────────────────────────────────────
const ROLES = [
  {
    name: "admin",
    description: "Full access — can manage users, projects, and all tasks",
    permissions: ["users:read", "users:write", "users:delete", "projects:read", "projects:write", "projects:delete", "tasks:read", "tasks:write", "tasks:delete"],
  },
  {
    name: "user",
    description: "Standard access — can view assigned projects and manage own tasks",
    permissions: ["projects:read", "tasks:read", "tasks:write"],
  },
];

/** Initial admin account.  Change these before running in production! */
const INITIAL_ADMIN = {
  firstName: "Admin",
  lastName: "User",
  email: "admin@taskmanager.com",
  password: "Admin@123",          // ← Change this!
  emailVerified: true,
};

/** Optional: additional regular users to seed */
const EXTRA_USERS: Array<{ firstName: string; lastName: string; email: string; password: string }> = [
  // Uncomment / add more users here:
  // { firstName: "Jane", lastName: "Doe", email: "jane@taskmanager.com", password: "User@123" },
  // { firstName: "John", lastName: "Smith", email: "john@taskmanager.com", password: "User@123" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const SALT_ROUNDS = 10;
const log = {
  info:    (msg: string) => console.log(`  ℹ  ${msg}`),
  success: (msg: string) => console.log(`  ✅ ${msg}`),
  skip:    (msg: string) => console.log(`  ⏭  ${msg}`),
  error:   (msg: string) => console.error(`  ❌ ${msg}`),
  header:  (msg: string) => console.log(`\n${"─".repeat(60)}\n  ${msg}\n${"─".repeat(60)}`),
};

// ─── Core seed functions ──────────────────────────────────────────────────────

async function seedRoles(db: mongoose.mongo.Db) {
  log.header("Seeding Roles");
  const collection = db.collection("roles");

  const roleIds: Record<string, mongoose.Types.ObjectId> = {};

  for (const roleData of ROLES) {
    const existing = await collection.findOne({ name: roleData.name });

    if (existing) {
      log.skip(`Role "${roleData.name}" already exists  →  _id: ${existing._id}`);
      roleIds[roleData.name] = existing._id as mongoose.Types.ObjectId;
    } else {
      const now = new Date();
      const result = await collection.insertOne({ ...roleData, createdAt: now, updatedAt: now });
      log.success(`Created role "${roleData.name}"  →  _id: ${result.insertedId}`);
      roleIds[roleData.name] = result.insertedId as mongoose.Types.ObjectId;
    }
  }

  return roleIds;
}

async function seedUser(
  db: mongoose.mongo.Db,
  userData: { firstName: string; lastName: string; email: string; password: string; emailVerified?: boolean },
  roleId: mongoose.Types.ObjectId,
  roleName: string
) {
  const collection = db.collection("users");
  const normalizedEmail = userData.email.toLowerCase().trim();

  const existing = await collection.findOne({ email: normalizedEmail });
  if (existing) {
    log.skip(`User "${normalizedEmail}" already exists — skipping`);
    return null;
  }

  const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);
  const now = new Date();

  const result = await collection.insertOne({
    firstName: userData.firstName.trim(),
    lastName: userData.lastName.trim(),
    email: normalizedEmail,
    password: hashedPassword,
    role: roleId,
    emailVerified: userData.emailVerified ?? false,
    emailVerifiedAt: userData.emailVerified ? now : null,
    createdAt: now,
    updatedAt: now,
  });

  log.success(
    `Created ${roleName} user "${normalizedEmail}"  →  _id: ${result.insertedId}\n` +
    `       Password: ${userData.password}  (hashed in DB)`
  );
  return result.insertedId;
}

async function seedAdminUser(db: mongoose.mongo.Db, roleIds: Record<string, mongoose.Types.ObjectId>) {
  log.header("Seeding Admin User");
  await seedUser(db, INITIAL_ADMIN, roleIds["admin"], "admin");
}

async function seedExtraUsers(db: mongoose.mongo.Db, roleIds: Record<string, mongoose.Types.ObjectId>) {
  if (EXTRA_USERS.length === 0) return;
  log.header("Seeding Extra Users");
  for (const u of EXTRA_USERS) {
    await seedUser(db, u, roleIds["user"], "user");
  }
}

// ─── Show current DB state ────────────────────────────────────────────────────
async function showSummary(db: mongoose.mongo.Db) {
  const rolesCount = await db.collection("roles").countDocuments();
  const usersCount = await db.collection("users").countDocuments();

  const roles = await db.collection("roles").find({}).project({ name: 1, description: 1 }).toArray();
  const users = await db.collection("users")
    .find({})
    .project({ firstName: 1, lastName: 1, email: 1, role: 1, emailVerified: 1 })
    .toArray();

  const adminRole = await db.collection("roles").findOne({ name: "admin" });
  const userRole  = await db.collection("roles").findOne({ name: "user" });

  log.header("Database Summary");
  console.log(`  Roles  (${rolesCount})`);
  roles.forEach((r: any) => console.log(`    • ${r.name.padEnd(8)} — ${r.description}`));

  console.log(`\n  Users  (${usersCount})`);
  users.forEach((u: any) => {
    const roleName = u.role?.toString() === adminRole?._id?.toString() ? "admin"
                   : u.role?.toString() === userRole?._id?.toString() ? "user"
                   : "unknown";
    const verified = u.emailVerified ? "✓ verified" : "✗ unverified";
    console.log(`    • ${u.email.padEnd(36)} role: ${roleName.padEnd(8)} ${verified}`);
  });
  console.log();
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\n╔══════════════════════════════════════════════════════════╗");
  console.log("║        TaskManager  —  Database Seed Script              ║");
  console.log("╚══════════════════════════════════════════════════════════╝");

  log.info(`Connecting to MongoDB  (db: ${DB_NAME}) …`);

  await mongoose.connect(MONGODB_URI!, { dbName: DB_NAME });
  log.success("Connected to MongoDB");

  const db = mongoose.connection.db!;

  const roleIds = await seedRoles(db);
  await seedAdminUser(db, roleIds);
  await seedExtraUsers(db, roleIds);
  await showSummary(db);

  await mongoose.disconnect();
  log.success("Done — database seeded successfully 🎉");
}

main().catch((err) => {
  console.error("\n❌  Seed failed:", err.message ?? err);
  mongoose.disconnect().finally(() => process.exit(1));
});
