import mongoose, { Schema, Document, Model } from "mongoose";
import type { DetailBlock } from "../shared/types";

export interface TaskDocument extends Document {
    userId: mongoose.Types.ObjectId;
    taskName: string;
    hours: number;
    details: DetailBlock[];
    createdAt: Date;
}

export interface TaskListItem {
    _id: string;
    taskName: string;
    hours: number;
    createdAt: Date;
    detailsCount: number;
    no: number;
}

const detailBlockSchema = new Schema<DetailBlock>(
    {
        text: { type: String, required: true },
        time: { type: String, required: true },
    },
    { _id: false }
);

const taskSchema = new Schema<TaskDocument>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "users", required: true, index: true },
        taskName: { type: String, required: true, trim: true },
        hours: { type: Number, required: true },
        details: { type: [detailBlockSchema], default: [] },
    },
    {
        timestamps: true,
        collection: "TaskManager",
    }
);

// Create indexes
taskSchema.index({ taskName: 1 });
taskSchema.index({ createdAt: -1 });

const Task = mongoose.models.TaskManager || mongoose.model<TaskDocument>("TaskManager", taskSchema);

export class TaskModel {
    private model: Model<TaskDocument>;

    constructor() {
        this.model = Task;
    }

    /**
     * Find a task by its name for a specific user
     */
    async findByTaskName(taskName: string, userId: string): Promise<TaskDocument | null> {
        return this.model.findOne({ taskName: taskName.trim(), userId });
    }

    /**
     * Create a new task
     */
    async create(taskData: Omit<TaskDocument, "_id" | "createdAt" | keyof Document>): Promise<{ insertedId: string; task: TaskDocument }> {
        const task = await this.model.create(taskData);
        return {
            insertedId: task._id.toString(),
            task,
        };
    }

    /**
     * Get all tasks with aggregation (sorted by createdAt, limited) for a specific user
     */
    async findAll(userId: string, limit: number = 100): Promise<TaskListItem[]> {
        const items = await this.model
            .aggregate([
                { $match: { userId: new mongoose.Types.ObjectId(userId) } },
                {
                    $project: {
                        _id: { $toString: "$_id" },
                        taskName: 1,
                        hours: 1,
                        createdAt: 1,
                        detailsCount: { $size: { $ifNull: ["$details", []] } },
                    },
                },
                { $sort: { createdAt: -1 } },
                { $limit: limit },
            ])
            .exec();

        // Add sequential number
        return items.map((item, index) => ({
            ...item,
            no: index + 1,
        })) as TaskListItem[];
    }

    /**
     * Get paginated tasks with total count for a specific user
     */
    async findPaginated(userId: string, page: number = 1, limit: number = 10): Promise<{ items: TaskListItem[]; total: number }> {
        const skip = (page - 1) * limit;

        // Get total count for this user
        const total = await this.model.countDocuments({ userId });

        // Get paginated items
        const items = await this.model
            .aggregate([
                { $match: { userId: new mongoose.Types.ObjectId(userId) } },
                {
                    $project: {
                        _id: { $toString: "$_id" },
                        taskName: 1,
                        hours: 1,
                        createdAt: 1,
                        detailsCount: { $size: { $ifNull: ["$details", []] } },
                    },
                },
                { $sort: { createdAt: -1 } },
                { $skip: skip },
                { $limit: limit },
            ])
            .exec();

        // Add sequential number based on absolute position
        const itemsWithNo = items.map((item, index) => ({
            ...item,
            no: skip + index + 1,
        })) as TaskListItem[];

        return { items: itemsWithNo, total };
    }

    async findById(id: string, userId: string): Promise<TaskDocument | null> {
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return null;
        }
        return this.model.findOne({ _id: id, userId });
    }

    async findBySequenceNumber(no: number, userId: string): Promise<TaskDocument | null> {
        if (no <= 0 || !Number.isInteger(no)) {
            return null;
        }

        return this.model
            .findOne({ userId })
            .sort({ createdAt: -1 })
            .skip(no - 1)
            .limit(1);
    }

    async getDetails(id: string, userId: string): Promise<DetailBlock[]> {
        const rawId = id.trim();
        const isObjectId = mongoose.Types.ObjectId.isValid(rawId);
        const numericNo = /^\d+$/.test(rawId) ? Number(rawId) : NaN;

        let task: TaskDocument | null = null;

        if (isObjectId) {
            task = await this.model.findOne({ _id: rawId, userId }).select("details");
        } else if (!Number.isNaN(numericNo) && numericNo > 0) {
            task = await this.model
                .findOne({ userId })
                .select("details")
                .sort({ createdAt: -1 })
                .skip(numericNo - 1)
                .limit(1);
        }
        return Array.isArray(task?.details) ? task.details : [];
    }
}
