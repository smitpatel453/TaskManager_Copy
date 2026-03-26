import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { generateToken, verifyEmailVerificationToken } from "../infrastructure/database/jwt.js";
import { UserModel } from "../models/user.model.js";
import type { AuthResponse } from "../shared/types/index.js";

export class AuthService {
  private userModel: UserModel;

  constructor() {
    this.userModel = new UserModel();
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    // Validate input
    if (!email || !password) {
      throw new Error("Email and password are required");
    }
    
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await this.userModel.findByEmail(normalizedEmail);
    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid credentials");
    }

    // Generate JWT token
    const token = await generateToken(user._id!.toString(), user.email);

    // Determine user role
    let userRole: "admin" | "user" = "user";
    
    if (user.role) {
      try {
        const db = mongoose.connection.db;
        if (db) {
          const adminRole = await db.collection("roles").findOne({ name: "admin" });
          if (adminRole && user.role.toString() === adminRole._id.toString()) {
            userRole = "admin";
          }
        }
      } catch (error) {
        console.error("Error checking admin role:", error);
      }
    }

    return {
      success: true,
      message: "Login successful",
      data: {
        token,
        userId: user._id!.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: userRole,
        emailVerified: user.emailVerified === true,
      },
    };
  }

  async verifyEmail(token: string): Promise<{ success: boolean; message: string }> {
    if (!token || typeof token !== "string") {
      throw new Error("Verification token is required");
    }

    const payload = await verifyEmailVerificationToken(token);
    if (!payload) {
      throw new Error("Invalid or expired verification token");
    }

    const user = await this.userModel.findById(payload.userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.emailVerified) {
      return { success: true, message: "Email already verified" };
    }

    await this.userModel.markEmailVerified(payload.userId);

    return { success: true, message: "Email verified successfully" };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    // Find user by ID
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password in database
    await this.userModel.updatePassword(userId, hashedNewPassword);

    return {
      success: true,
      message: "Password changed successfully",
    };
  }
}
