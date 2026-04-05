import mongoose, { Schema, Document, Model } from "mongoose";

export interface UserDocument extends Document {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role?: mongoose.Types.ObjectId;
    emailVerified?: boolean;
    emailVerifiedAt?: Date;
    createdAt: Date;
}

const userSchema = new Schema<UserDocument>(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
        role: { type: Schema.Types.ObjectId, ref: "roles" },
        emailVerified: { type: Boolean, default: false },
        emailVerifiedAt: { type: Date },
    },
    {
        timestamps: true,
        collection: "users",
    }
);

// Create indexes for better query performance
userSchema.index({ email: 1 }); // For finding users by email (unique constraint already creates index)
userSchema.index({ role: 1 }); // For filtering users by role
userSchema.index({ createdAt: -1 }); // For sorting by creation date
userSchema.index({ firstName: 1, lastName: 1 }); // For searching by name
userSchema.index({ emailVerified: 1 }); // For filtering verified users

const User = mongoose.models.users || mongoose.model<UserDocument>("users", userSchema);

export class UserModel {
    private model: Model<UserDocument>;

    constructor() {
        this.model = User;
    }

    /**
     * Normalize email (lowercase and trim)
     */
    private normalizeEmail(email: string): string {
        return email.toLowerCase().trim();
    }

    /**
     * Find a user by email
     */
    async findByEmail(email: string): Promise<UserDocument | null> {
        return this.model.findOne({ email: this.normalizeEmail(email) });
    }

    /**
     * Create a new user
     */
    async create(userData: Omit<UserDocument, "_id" | "createdAt" | keyof Document>): Promise<{ insertedId: string; user: UserDocument }> {
        // Ensure email is normalized
        const normalizedData = {
            ...userData,
            email: this.normalizeEmail(userData.email),
        };

        const user = await this.model.create(normalizedData);

        return {
            insertedId: user._id.toString(),
            user,
        };
    }

    /**
     * Find a user by ID
     */
    async findById(userId: string): Promise<UserDocument | null> {
        return this.model.findById(userId);
    }

    /**
     * Update user password
     */
    async updatePassword(userId: string, hashedPassword: string): Promise<UserDocument | null> {
        return this.model.findByIdAndUpdate(userId, { password: hashedPassword }, { new: true });
    }

    /**
     * Mark email as verified
     */
    async markEmailVerified(userId: string): Promise<UserDocument | null> {
        return this.model.findByIdAndUpdate(
            userId,
            { emailVerified: true, emailVerifiedAt: new Date() },
            { new: true }
        );
    }
}

// Export the raw Mongoose model for direct use in controllers
export const UserMongooseModel = User;
