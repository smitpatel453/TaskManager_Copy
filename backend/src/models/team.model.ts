import mongoose, { Document, Model, Schema } from "mongoose";

export interface TeamDocument extends Document {
    teamName: string;
    description?: string;
    isPrivate: boolean;
    members: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const teamSchema = new Schema<TeamDocument>(
    {
        teamName: { type: String, required: true, trim: true },
        description: { type: String, default: "", trim: true },
        isPrivate: { type: Boolean, default: false },
        members: [{ type: Schema.Types.ObjectId, ref: "users" }],
        createdBy: { type: Schema.Types.ObjectId, ref: "users", required: true },
    },
    {
        timestamps: true,
        collection: "teams",
    }
);

teamSchema.index({ teamName: 1 });
teamSchema.index({ members: 1 });
teamSchema.index({ createdBy: 1 });
teamSchema.index({ isPrivate: 1 });

const Team = (mongoose.models.teams as Model<TeamDocument>) || mongoose.model<TeamDocument>("teams", teamSchema);

export class TeamModel {
    private model: Model<TeamDocument>;

    constructor() {
        this.model = Team;
    }

    async create(data: {
        teamName: string;
        description?: string;
        isPrivate?: boolean;
        members: mongoose.Types.ObjectId[];
        createdBy: mongoose.Types.ObjectId;
    }): Promise<TeamDocument> {
        return this.model.create(data);
    }

    async findById(teamId: string): Promise<TeamDocument | null> {
        if (!mongoose.Types.ObjectId.isValid(teamId)) return null;
        return this.model
            .findById(teamId)
            .populate("members", "firstName lastName email")
            .populate("createdBy", "firstName lastName email");
    }

    async findVisibleForUser(userId: string, isAdmin: boolean): Promise<TeamDocument[]> {
        if (!mongoose.Types.ObjectId.isValid(userId)) return [];

        if (isAdmin) {
            return this.model
                .find({})
                .populate("members", "firstName lastName email")
                .populate("createdBy", "firstName lastName email")
                .sort({ createdAt: -1 });
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);
        return this.model
            .find({
                $or: [
                    { isPrivate: false },
                    { createdBy: userObjectId },
                    { members: userObjectId },
                ],
            })
            .populate("members", "firstName lastName email")
            .populate("createdBy", "firstName lastName email")
            .sort({ createdAt: -1 });
    }

    async findByIdAndUpdate(teamId: string, updates: any): Promise<TeamDocument | null> {
        if (!mongoose.Types.ObjectId.isValid(teamId)) return null;
        return this.model
            .findByIdAndUpdate(teamId, updates, { new: true })
            .populate("members", "firstName lastName email")
            .populate("createdBy", "firstName lastName email");
    }

    async addMember(teamId: string, memberId: mongoose.Types.ObjectId): Promise<void> {
        if (!mongoose.Types.ObjectId.isValid(teamId)) return;
        await this.model.findByIdAndUpdate(teamId, { $addToSet: { members: memberId } });
    }

    async removeMember(teamId: string, memberId: mongoose.Types.ObjectId): Promise<void> {
        if (!mongoose.Types.ObjectId.isValid(teamId)) return;
        await this.model.findByIdAndUpdate(teamId, { $pull: { members: memberId } });
    }

    async deleteById(teamId: string): Promise<void> {
        if (!mongoose.Types.ObjectId.isValid(teamId)) return;
        await this.model.deleteOne({ _id: new mongoose.Types.ObjectId(teamId) });
    }
}
