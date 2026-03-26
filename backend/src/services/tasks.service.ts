import mongoose from "mongoose";
import { TaskModel } from "../models/task.model.js";
import { EmailService } from "./email.service.js";
import type { CreateTaskRequest, DetailBlock, TaskStatus } from "../shared/types/index.js";

function isValidTimeHHMM(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) { return false; }
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function isValidStatus(value: unknown): value is TaskStatus {
  return value === "to-do" || value === "in-progress" || value === "completed";
}

export class TasksService {
  private taskModel: TaskModel;
  private emailService: EmailService;

  constructor() {
    this.taskModel = new TaskModel();
    this.emailService = new EmailService();
  }

  async createTask(data: CreateTaskRequest, userId: string): Promise<any> {
    // Validate projectId if provided
    let projectIdObj: mongoose.Types.ObjectId | undefined;
    if (data.projectId && data.projectId.trim()) {
      if (!mongoose.Types.ObjectId.isValid(data.projectId)) {
        throw new Error("Invalid projectId");
      }

      // Verify project exists
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error("Database connection failed");
      }

      const project = await db.collection("projects").findOne({ _id: new mongoose.Types.ObjectId(data.projectId) });
      if (!project) {
        throw new Error("Project not found");
      }
      projectIdObj = new mongoose.Types.ObjectId(data.projectId);
    }

    // Database connection check
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection failed");
    }

    // Check for admin privileges to determine assignment restrictions
    const isAdmin = await this.isUserAdmin(userId);

    // If assignedTo is not provided, check admin requirement
    if (!data.assignedTo) {
      if (isAdmin) {
        // Admins must specify assignedTo
        throw new Error("Admins must specify assignedTo when creating tasks");
      }
      // Regular users default to themselves
    }

    // If assignedTo is provided, validate it and check admin restrictions
    const assignedToUser = data.assignedTo || userId;

    // Validate assignedTo user exists
    if (!mongoose.Types.ObjectId.isValid(assignedToUser)) {
      throw new Error("Invalid assignedTo user ID");
    }

    const assignedUser = await db.collection("users").findOne({ _id: new mongoose.Types.ObjectId(assignedToUser) });
    if (!assignedUser) {
      throw new Error("Assigned user not found");
    }

    // If admin and assignedTo is provided, they cannot assign to themselves
    if (isAdmin && assignedToUser === userId) {
      throw new Error("Admins cannot assign tasks to themselves");
    }

    // Regular users can only assign to themselves
    if (!isAdmin && assignedToUser !== userId) {
      throw new Error("You can only assign tasks to yourself");
    }

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

    const startDate = parseDate(data.startDate);
    const dueDate = parseDate(data.dueDate);
    if (data.startDate && !startDate) {
      throw new Error("startDate must be a valid date");
    }
    if (data.dueDate && !dueDate) {
      throw new Error("dueDate must be a valid date");
    }
    if (startDate && dueDate && dueDate < startDate) {
      throw new Error("dueDate cannot be before startDate");
    }

    const status: TaskStatus = isValidStatus(data.status) ? data.status : "to-do";

    // Validate and clean tags
    const cleanedTags: string[] = Array.isArray(data.tags)
      ? data.tags.map(tag => String(tag).trim()).filter(tag => tag.length > 0)
      : [];

    // Create task document
    const taskData: any = {
      userId: new mongoose.Types.ObjectId(userId),
      taskName: data.taskName.trim(),
      description: data.description?.trim(),
      details: cleanedDetails,
      hours: data.hours,
      status,
      assignedTo: new mongoose.Types.ObjectId(assignedToUser),
      startDate: startDate ?? undefined,
      dueDate: dueDate ?? undefined,
      priority: data.priority,
      tags: cleanedTags,
      createdAt: new Date(),
    };

    // Only add projectId if it was provided
    if (projectIdObj) {
      taskData.projectId = projectIdObj;
    }

    const result = await this.taskModel.create(taskData);

    const assignedUserEmail = typeof assignedUser.email === "string" ? assignedUser.email : null;
    const assignedUserName = [assignedUser.firstName, assignedUser.lastName].filter(Boolean).join(" ") || "there";
    const assignedUserVerified = assignedUser.emailVerified === true;

    if (assignedUserEmail && assignedUserVerified) {
      try {
        await this.emailService.sendTaskAssignedEmail({
          to: assignedUserEmail,
          recipientName: assignedUserName,
          taskName: taskData.taskName,
          details: cleanedDetails,
          hours: taskData.hours,
          status: taskData.status,
          startDate,
          dueDate,
        });
      } catch (error) {
        console.error("Failed to send task assignment email:", error);
      }
    } else if (assignedUserEmail && !assignedUserVerified) {
      console.warn("Skipping task assignment email for unverified user:", assignedUserEmail);
    }

    return {
      ok: true,
      insertedId: result.insertedId,
      task: result.task,
    };
  }

  async getTasks(userId: string, page: number = 1, limit: number = 10, filter: string = "all"): Promise<any> {
    // Validate and sanitize inputs
    const validPage = Math.max(1, Math.floor(page));
    const validLimit = Math.max(1, Math.min(100, Math.floor(limit))); // Max 100 items per page
    const validFilter = ["all", "created", "assigned"].includes(filter) ? filter : "all";

    // Check if user is admin
    const isAdmin = await this.isUserAdmin(userId);

    let items, total;
    if (isAdmin) {
      // Admin sees all tasks (or filtered)
      const result = await this.taskModel.findAllPaginated(validPage, validLimit, userId, validFilter);
      items = result.items;
      total = result.total;
    } else {
      // Regular users see only tasks they created or tasks assigned to them
      const result = await this.taskModel.findPaginated(userId, validPage, validLimit, validFilter);
      items = result.items;
      total = result.total;
    }

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

  /**
   * Check if a user is admin
   */
  private async isUserAdmin(userId: string): Promise<boolean> {
    try {
      if (!mongoose.Types.ObjectId.isValid(userId)) { return false; }
      const db = mongoose.connection.db;
      if (!db) {
        return false;
      }

      const user = await db.collection("users").findOne({ _id: new mongoose.Types.ObjectId(userId) });
      if (!user || !user.role) {
        return false;
      }

      const adminRole = await db.collection("roles").findOne({ name: "admin" });
      if (!adminRole) {
        return false;
      }

      return user.role.toString() === adminRole._id.toString();
    } catch (error) {
      console.error("Error checking admin status:", error);
      return false;
    }
  }

  async getTaskDetails(id: string, userId: string): Promise<any> {
    const rawId = typeof id === "string" ? id.trim() : "";

    // Validate ID format
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(rawId);
    const isValidNumber = /^\d+$/.test(rawId) && Number(rawId) > 0;

    if (!isValidObjectId && !isValidNumber) {
      throw new Error("Invalid id");
    }

    // Check if user is admin
    const isAdmin = await this.isUserAdmin(userId);

    const details = await this.taskModel.getDetails(rawId, userId, isAdmin);
    return { ok: true, details };
  }

  async updateTaskDetail(taskId: string, detailIndex: number, updatedDetail: { text: string; time: string }, userId: string): Promise<any> {
    // Validate taskId format
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      throw new Error("Invalid task ID");
    }

    // Validate inputs
    if (typeof detailIndex !== "number" || detailIndex < 0) {
      throw new Error("Invalid detail index");
    }

    if (typeof updatedDetail.text !== "string" || !updatedDetail.text.trim()) {
      throw new Error("Detail text is required");
    }

    if (!isValidTimeHHMM(updatedDetail.time)) {
      throw new Error("Detail time must be in HH:MM format");
    }

    const cleanedDetail: DetailBlock = {
      text: updatedDetail.text.trim(),
      time: updatedDetail.time,
    };

    // Check if user is admin
    const isAdmin = await this.isUserAdmin(userId);

    const task = await this.taskModel.updateDetail(taskId, detailIndex, cleanedDetail, userId, isAdmin);
    if (!task) {
      throw new Error("Task not found or invalid detail index");
    }

    return { ok: true, detail: cleanedDetail };
  }

  async updateTaskStatus(taskId: string, status: TaskStatus, userId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(taskId)) {
      throw new Error("Invalid task ID");
    }

    // Validate status
    if (!isValidStatus(status)) {
      throw new Error("Invalid task status");
    }

    const isAdmin = await this.isUserAdmin(userId);
    const task = await this.taskModel.findById(taskId, userId, isAdmin);

    if (!task) {
      throw new Error("Task not found or access denied");
    }

    // Update status
    task.status = status;
    await task.save();

    return { success: true, message: "Task status updated successfully", status };
  }
}
