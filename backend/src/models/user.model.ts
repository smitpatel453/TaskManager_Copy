import mongoose, { Schema, Document, Model } from "mongoose";

export interface UserDocument extends Document {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    createdAt: Date;
}

const userSchema = new Schema<UserDocument>(
    {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        password: { type: String, required: true },
    },
    {
        timestamps: true,
        collection: "users",
    }
);

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
     * Check if a user exists by email
     */
    async existsByEmail(email: string): Promise<boolean> {
        const user = await this.findByEmail(email);
        return user !== null;
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
}
