import mongoose from "mongoose";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

async function migrateTaskFields() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/taskmanager");
    console.log("✓ Connected to MongoDB");

    const db = mongoose.connection.db;
    const collection = db.collection("TaskManager");

    console.log("\nStarting migration...");

    // Find documents missing status, startDate, or dueDate
    const tasksToUpdate = await collection
      .find({
        $or: [
          { status: { $exists: false } },
          { startDate: { $exists: false } },
          { dueDate: { $exists: false } },
        ],
      })
      .toArray();

    console.log(`Found ${tasksToUpdate.length} tasks to update`);

    if (tasksToUpdate.length === 0) {
      console.log("✓ All tasks already have the required fields!");
      await mongoose.connection.close();
      return;
    }

    // Update documents with default values
    const result = await collection.updateMany(
      {
        $or: [
          { status: { $exists: false } },
          { startDate: { $exists: false } },
          { dueDate: { $exists: false } },
        ],
      },
      [
        {
          $set: {
            status: { $ifNull: ["$status", "to-do"] },
            startDate: { $ifNull: ["$startDate", null] },
            dueDate: { $ifNull: ["$dueDate", null] },
          },
        },
      ]
    );

    console.log(`✓ Updated ${result.modifiedCount} documents`);
    console.log(`  - Matched: ${result.matchedCount}`);
    console.log(`  - Modified: ${result.modifiedCount}`);

    // Verify the migration
    const updatedCount = await collection.countDocuments({
      status: { $exists: true },
      startDate: { $exists: true },
      dueDate: { $exists: true },
    });

    console.log(`\n✓ Verification: ${updatedCount} tasks now have all fields`);

    // Show sample updated task
    const sample = await collection.findOne({
      status: { $exists: true },
    });

    if (sample) {
      console.log("\nSample updated task:");
      console.log({
        _id: sample._id,
        taskName: sample.taskName,
        status: sample.status,
        startDate: sample.startDate,
        dueDate: sample.dueDate,
      });
    }

    console.log("\n✓ Migration completed successfully!");
  } catch (error) {
    console.error("✗ Migration failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    console.log("Database connection closed");
  }
}

// Run the migration
migrateTaskFields();
