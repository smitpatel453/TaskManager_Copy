import mongoose from "mongoose";
import { TaskModel } from "../models/task.model";
import type { CreateTaskRequest, DetailBlock } from "../shared/types";

function isValidTimeHHMM(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return /^\d{2}:\d{2}$/.test(value);
}

export class TasksService {
  private taskModel: TaskModel;

  constructor() {
    this.taskModel = new TaskModel();
  }

  async createTask(data: CreateTaskRequest, userId: string): Promise<any> {
    // Check if task name already exists for this user
    const existingTask = await this.taskModel.findByTaskName(data.taskName.trim(), userId);
    if (existingTask) {
      throw new Error("Task name already exists. Please use a unique name.");
    }

    // Validate and clean details
    const cleanedDetails: DetailBlock[] = [];
    for (let i = 0; i < data.details.length; i++) {
      const d = data.details[i] as Partial<DetailBlock>;
      const text = typeof d.text === "string" ? d.text.trim() : "";
      if (!text) continue;

      if (!isValidTimeHHMM(d.time)) {
        throw new Error(`details[${i}] must include a valid time (HH:MM)`);
      }

      cleanedDetails.push({ text, time: d.time });
    }

    if (cleanedDetails.length === 0) {
      throw new Error("At least one detail with text is required");
    }

    // Create task document
    const taskData = {
      userId: new mongoose.Types.ObjectId(userId),
      taskName: data.taskName.trim(),
      details: cleanedDetails,
      hours: data.hours,
      createdAt: new Date(),
    };

    const result = await this.taskModel.create(taskData);

    return {
      ok: true,
      insertedId: result.insertedId,
      task: result.task,
    };
  }

  async getTasks(userId: string, page: number = 1, limit: number = 10): Promise<any> {
    // Validate and sanitize inputs
    const validPage = Math.max(1, Math.floor(page));
    const validLimit = Math.max(1, Math.min(100, Math.floor(limit))); // Max 100 items per page

    const { items, total } = await this.taskModel.findPaginated(userId, validPage, validLimit);
    const totalPages = Math.ceil(total / validLimit);

    return {
      success: true,
      data: items,
      pagination: {
        currentPage: validPage,
        totalPages,
        totalItems: total,
        itemsPerPage: validLimit,
        hasNextPage: validPage < totalPages,
        hasPreviousPage: validPage > 1,
      },
      message: "Tasks retrieved successfully",
    };
  }

  async getTaskDetails(id: string, userId: string): Promise<any> {
    const rawId = typeof id === "string" ? id.trim() : "";

    // Validate ID format
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(rawId);
    const isValidNumber = /^\d+$/.test(rawId) && Number(rawId) > 0;

    if (!isValidObjectId && !isValidNumber) {
      throw new Error("Invalid id");
    }

    const details = await this.taskModel.getDetails(rawId, userId);
    return { ok: true, details };
  }
}
