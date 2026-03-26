import mongoose, { Schema, Document, Model } from "mongoose";

export interface ProjectDocument extends Document {
    projectName: string;
    projectDescription: string;
    teamId: mongoose.Types.ObjectId;
    assignedUsers: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const projectSchema = new Schema<ProjectDocument>(
    {
        projectName: { type: String, required: true, trim: true },
        projectDescription: { type: String, required: true, trim: true },
        teamId: { type: Schema.Types.ObjectId, ref: "teams", required: true, index: true },
        assignedUsers: {
            type: [Schema.Types.ObjectId],
            ref: "users",
            default: [],
        },
        createdBy: { type: Schema.Types.ObjectId, ref: "users", required: true },
    },
    {
        timestamps: true,
        collection: "projects",
    }
);

// Create indexes for better query performance
projectSchema.index({ createdBy: 1 }); // For finding projects by creator
projectSchema.index({ assignedUsers: 1 }); // For finding projects by assigned user
projectSchema.index({ projectName: 1 }); // For searching by project name
projectSchema.index({ createdAt: -1 }); // For sorting by creation date
projectSchema.index({ createdBy: 1, createdAt: -1 }); // Compound index for user's projects sorted by date
projectSchema.index({ teamId: 1 }); // For listing projects by team

const Project = mongoose.models.projects || mongoose.model<ProjectDocument>("projects", projectSchema);

export class ProjectModel {
    private model: Model<ProjectDocument>;

    constructor() {
        this.model = Project;
    }

    /**
     * Validate ObjectId format
     */
    private validateObjectId(id: string, fieldName: string): void {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            throw new Error(`Invalid ${fieldName} format`);
        }
    }

    /**
     * Create a new project
     */
    async create(projectData: Omit<ProjectDocument, "_id" | "createdAt" | "updatedAt" | keyof Document>): Promise<{ insertedId: string; project: ProjectDocument }> {
        const project = await this.model.create(projectData);

        return {
            insertedId: project._id.toString(),
            project,
        };
    }

    /**
     * Find a project by ID
     */
    async findById(projectId: string): Promise<ProjectDocument | null> {
        this.validateObjectId(projectId, "projectId");
        return this.model
            .findById(projectId)
            .populate("assignedUsers", "firstName lastName email")
            .populate("teamId", "teamName");
    }

    /**
     * Find all projects (admin view)
     */
    async findAll(): Promise<ProjectDocument[]> {
        return this.model
            .find()
            .populate("assignedUsers", "firstName lastName email")
            .populate("createdBy", "firstName lastName email")
            .populate("teamId", "teamName")
            .sort({ createdAt: -1 });
    }

    /**
     * Find projects by assigned user ID
     */
    async findByAssignedUser(userId: string): Promise<ProjectDocument[]> {
        this.validateObjectId(userId, "userId");
        return this.model
            .find({ assignedUsers: new mongoose.Types.ObjectId(userId) })
            .populate("assignedUsers", "firstName lastName email")
            .populate("createdBy", "firstName lastName email")
            .populate("teamId", "teamName")
            .sort({ createdAt: -1 });
    }

    /**
     * Update a project
     */
    async update(projectId: string, updateData: Partial<Omit<ProjectDocument, "_id" | "createdAt" | "updatedAt" | keyof Document>>): Promise<ProjectDocument | null> {
        this.validateObjectId(projectId, "projectId");
        return this.model.findByIdAndUpdate(projectId, updateData, { new: true, runValidators: true })
            .populate("assignedUsers", "firstName lastName email")
            .populate("createdBy", "firstName lastName email")
            .populate("teamId", "teamName");
    }

    /**
     * Delete a project
     */
    async delete(projectId: string): Promise<boolean> {
        this.validateObjectId(projectId, "projectId");
        const result = await this.model.findByIdAndDelete(projectId);
        return result !== null;
    }

    /**
     * Check if a project exists by name
     */
    async existsByName(projectName: string): Promise<boolean> {
        const project = await this.model.findOne({ projectName: projectName.trim() });
        return project !== null;
    }
}

