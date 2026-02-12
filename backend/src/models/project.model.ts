import mongoose, { Schema, Document, Model } from "mongoose";

export interface ProjectDocument extends Document {
    projectName: string;
    projectDescription: string;
    assignedUsers: mongoose.Types.ObjectId[];
    createdBy: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const projectSchema = new Schema<ProjectDocument>(
    {
        projectName: { type: String, required: true, trim: true },
        projectDescription: { type: String, required: true, trim: true },
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

const Project = mongoose.models.projects || mongoose.model<ProjectDocument>("projects", projectSchema);

export class ProjectModel {
    private model: Model<ProjectDocument>;

    constructor() {
        this.model = Project;
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
        return this.model.findById(projectId).populate("assignedUsers", "firstName lastName email");
    }

    /**
     * Find all projects (admin view)
     */
    async findAll(): Promise<ProjectDocument[]> {
        return this.model.find().populate("assignedUsers", "firstName lastName email").populate("createdBy", "firstName lastName email").sort({ createdAt: -1 });
    }

    /**
     * Find projects by assigned user ID
     */
    async findByAssignedUser(userId: string): Promise<ProjectDocument[]> {
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error("Invalid userId format");
        }
        return this.model
            .find({ assignedUsers: new mongoose.Types.ObjectId(userId) })
            .populate("assignedUsers", "firstName lastName email")
            .populate("createdBy", "firstName lastName email")
            .sort({ createdAt: -1 });
    }

    /**
     * Update a project
     */
    async update(projectId: string, updateData: Partial<Omit<ProjectDocument, "_id" | "createdAt" | "updatedAt" | keyof Document>>): Promise<ProjectDocument | null> {
        return this.model.findByIdAndUpdate(projectId, updateData, { new: true, runValidators: true })
            .populate("assignedUsers", "firstName lastName email")
            .populate("createdBy", "firstName lastName email");
    }

    /**
     * Delete a project
     */
    async delete(projectId: string): Promise<boolean> {
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

