import bcrypt from "bcrypt";
import { generateToken } from "../infrastructure/database/jwt";
import { UserModel } from "../models/user.model";
import type { LoginRequest, AuthResponse } from "../shared/types";

export class AuthService {
  private userModel: UserModel;

  constructor() {
    this.userModel = new UserModel();
  }

  async register(data: LoginRequest): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.userModel.findByEmail(data.email);
    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(data.password, saltRounds);

    // Create user document
    const userDoc = {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      email: data.email.toLowerCase().trim(),
      password: hashedPassword,
      createdAt: new Date(),
    };

    const result = await this.userModel.create(userDoc);
    const userId = result.insertedId.toString();

    // Generate JWT token
    const token = await generateToken(userId, result.user.email);

    return {
      success: true,
      message: "User registered successfully",
      data: {
        token,
        userId,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
    };
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await this.userModel.findByEmail(normalizedEmail);
    if (!user) {
      throw new Error("User not found");
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new Error("Invalid password");
    }

    // Generate JWT token
    const token = await generateToken(user._id!.toString(), user.email);

    return {
      success: true,
      message: "Login successful",
      data: {
        token,
        userId: user._id!.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
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
