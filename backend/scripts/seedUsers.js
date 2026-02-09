import mongoose from "mongoose";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/mydb";

// Define User schema
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  createdAt: Date,
});

const User = mongoose.model("User", userSchema);

async function seedDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✓ Connected to MongoDB");

    // Clear existing users
    // await User.deleteMany({});
    // console.log("✓ Cleared existing users");

    // Create test users
    const saltRounds = 10;
    const testUsers = [
      {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: await bcrypt.hash("password123", saltRounds),
        createdAt: new Date(),
      },
      {
        firstName: "Jane",
        lastName: "Smith",
        email: "jane@example.com",
        password: await bcrypt.hash("password456", saltRounds),
        createdAt: new Date(),
      },
      {
        firstName: "Bob",
        lastName: "Johnson",
        email: "bob@example.com",
        password: await bcrypt.hash("password789", saltRounds),
        createdAt: new Date(),
      },
    ];

    // Insert users
    const result = await User.insertMany(testUsers);
    console.log(`✓ Created ${result.length} test users`);

    // Log user credentials
    console.log("\n📋 Test User Credentials:");
    console.log("─".repeat(50));
    console.log("User 1:\n  Email: john@example.com\n  Password: password123\n");
    console.log("User 2:\n  Email: jane@example.com\n  Password: password456\n");
    console.log("User 3:\n  Email: bob@example.com\n  Password: password789\n");

    console.log("✓ Seed completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("✗ Seed failed:", error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

seedDatabase();