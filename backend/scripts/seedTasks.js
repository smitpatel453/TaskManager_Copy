import mongoose from "mongoose";
import dotenv from "dotenv";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Always load env from backend root
dotenv.config({ path: path.resolve(__dirname, "..", ".env.local") });

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/mydb";
const SEED_USER_ID = process.env.SEED_USER_ID;

// -------- schemas --------
const detailBlockSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    time: { type: String, required: true }, // "HH:MM"
  },
  { _id: false }
);

const taskSchema = new mongoose.Schema(
  {
    // ✅ assign task to a user
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    taskName: { type: String, required: true, trim: true },

    hours: { type: Number, required: true }, // fixed to 2
    details: { type: [detailBlockSchema], default: [] },
  },
  {
    timestamps: true,
    collection: "TaskManager",
  }
);

// ✅ unique taskName per user (NOT globally)
taskSchema.index({ userId: 1, taskName: 1 }, { unique: true });

const Task = mongoose.model("TaskManager", taskSchema);

// -------- helpers --------
const pad2 = (n) => String(n).padStart(2, "0");

function minsToHHMM(totalMins) {
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  return `${pad2(h)}:${pad2(m)}`;
}

function hhmmToMins(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function randInt(min, max) {
  return crypto.randomInt(min, max + 1);
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function partitionMinutes(totalMinutes, parts, minChunk = 5) {
  if (parts * minChunk > totalMinutes) {
    throw new Error("parts * minChunk cannot exceed totalMinutes");
  }

  const chunks = Array(parts).fill(minChunk);
  let remaining = totalMinutes - parts * minChunk;

  while (remaining > 0) {
    const i = randInt(0, parts - 1);
    const add = Math.min(remaining, randInt(1, Math.min(remaining, 30)));
    chunks[i] += add;
    remaining -= add;
  }

  return chunks;
}

// ✅ enforce uniqueness in generated names (within this run)
function buildRandomTask(i, usedNames, userId) {
  const HOURS_FIXED = 2;
  const TOTAL_MINUTES = HOURS_FIXED * 60;

  const taskPrefixes = [
    "Sprint",
    "API",
    "UI",
    "Release",
    "Customer",
    "Bugfix",
    "Infra",
    "Docs",
    "QA",
    "Analytics",
  ];

  const taskSuffixes = [
    "Planning",
    "Refactor",
    "Polish",
    "Checklist",
    "Follow-ups",
    "Hardening",
    "Review",
    "Iteration",
    "Cleanup",
    "Deployment",
  ];

  const detailTexts = [
    "Review backlog and priorities",
    "Estimate tickets",
    "Finalize scope",
    "Audit endpoints",
    "Improve validation",
    "Update pagination logic",
    "Add response metadata",
    "Fix UI spacing",
    "Improve empty state",
    "Verify mobile layout",
    "Run smoke tests",
    "Update release notes",
    "Tag release",
    "Reply to inbox",
    "Schedule follow-up calls",
    "Write documentation",
    "Add unit tests",
    "Add integration tests",
    "Refine error handling",
    "Check monitoring dashboards",
  ];

  const detailsCount = randInt(2, 5);
  const minuteChunks = partitionMinutes(TOTAL_MINUTES, detailsCount, 5);

  const details = minuteChunks.map((mins) => ({
    text: pick(detailTexts),
    time: minsToHHMM(mins),
  }));

  const sumMins = details.reduce((acc, d) => acc + hhmmToMins(d.time), 0);
  if (sumMins !== TOTAL_MINUTES) {
    throw new Error(
      `Detail time mismatch: got ${sumMins} mins, expected ${TOTAL_MINUTES} mins`
    );
  }

  let taskName;
  do {
    const suffix = crypto.randomBytes(3).toString("hex");
    taskName = `${pick(taskPrefixes)} ${pick(taskSuffixes)} #${i + 1}-${suffix}`;
  } while (usedNames.has(taskName));

  usedNames.add(taskName);

  return {
    userId,
    taskName,
    hours: HOURS_FIXED,
    details,
  };
}

// -------- seed --------
async function seedTasks() {
  if (!SEED_USER_ID) {
    console.error("✗ Missing SEED_USER_ID in environment");
    process.exit(1);
  }

  if (!mongoose.isValidObjectId(SEED_USER_ID)) {
    console.error("✗ SEED_USER_ID must be a valid Mongo ObjectId");
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB");

    // If you previously had `taskName` unique globally, drop that old index once.
    // Comment this out after the first successful run.
    // try { await Task.collection.dropIndex("taskName_1"); } catch (_) {}

    // ✅ ensure indexes exist (compound unique per user)
    await Task.syncIndexes();

    const minTasks = 75;
    const maxTasks = 100;
    const totalTasksToGenerate = randInt(minTasks, maxTasks);

    const usedNames = new Set();
    const tasks = [];

    for (let i = 0; i < totalTasksToGenerate; i++) {
      tasks.push(buildRandomTask(i, usedNames, SEED_USER_ID));
    }

    const result = await Task.insertMany(tasks, { ordered: true });

    console.log(
      `✓ Created ${result.length} tasks for userId=${SEED_USER_ID} (hours=2, details sum=02:00 each)`
    );

    process.exit(0);
  } catch (error) {
    console.error("✗ Task seed failed:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

seedTasks();
