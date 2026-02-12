import mongoose from "mongoose";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

async function promoteUserToAdmin() {
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

    console.log(`\nAdmin Role ID: ${adminRole._id}`);

    // Get email from command line argument
    const email = process.argv[2];
    if (!email) {
      console.log("\nUsage: npm run promote:admin <email>");
      console.log("Example: npm run promote:admin john@example.com");

      // List all users
      console.log("\nAvailable users:");
      const users = await usersCollection.find({}).project({ email: 1, firstName: 1, lastName: 1, role: 1 }).toArray();
      users.forEach((user, index) => {
        const roleDisplay = user.role?.toString() === adminRole._id.toString() ? "admin" : "user";
        console.log(`  ${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - Role: ${roleDisplay}`);
      });

      await mongoose.connection.close();
      return;
    }

    console.log(`\nPromoting user with email: ${email}`);

    // Find user
    const user = await usersCollection.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      console.log("✗ User not found");
      await mongoose.connection.close();
      process.exit(1);
      return;
    }

    if (user.role?.toString() === adminRole._id.toString()) {
      console.log(`ℹ User ${user.firstName} ${user.lastName} is already an admin`);
      await mongoose.connection.close();
      return;
    }

    // Update role to admin ObjectId
    const result = await usersCollection.updateOne(
      { email: email.toLowerCase().trim() },
      { $set: { role: adminRole._id } }
    );

    if (result.modifiedCount === 1) {
      console.log(`✓ Successfully promoted ${user.firstName} ${user.lastName} to Admin`);
      console.log(`  Role set to: ${adminRole._id}`);
    } else {
      console.log("✗ Failed to update user role");
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error("✗ Error:", error instanceof Error ? error.message : String(error));
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the script
promoteUserToAdmin();
