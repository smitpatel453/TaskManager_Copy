// ============ Auth Types ============
export interface LoginRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  data: {
    token: string;
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: "admin" | "user";
    emailVerified: boolean;
  };
  message: string;
}

// ============ Task Types ============
export interface DetailBlock {
  text: string;
  time: string; // "HH:MM"
}

export type TaskStatus = "to-do" | "in-progress" | "completed";

export interface CreateTaskRequest {
  taskName: string;
  description?: string;
  hours: number;
  details: DetailBlock[];
  status: TaskStatus;
  priority?: "low" | "normal" | "high" | "urgent";
  tags?: string[];
  projectId?: string;
  assignedTo?: string; // User ID to assign the task
  startDate?: string;
  dueDate?: string;
}

export interface Task {
  _id: string;
  taskName: string;
  description?: string;
  hours: number;
  details: DetailBlock[];
  status: TaskStatus;
  priority?: "low" | "normal" | "high" | "urgent";
  tags?: string[];
  projectId?: string;
  assignedTo?: string; // User ID the task is assigned to
  startDate?: string;
  dueDate?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationMetadata {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface GetTasksResponse {
  success: boolean;
  data: Task[];
  pagination: PaginationMetadata;
  message: string;
}

export interface TaskDetailsResponse {
  success: boolean;
  details: DetailBlock[];
  message: string;
}
// ============ Project Types ============
export interface CreateProjectRequest {
  projectName: string;
  projectDescription: string;
  assignedUsers: string[]; // Array of user IDs
}

export interface Project {
  _id: string;
  projectName: string;
  projectDescription: string;
  assignedUsers: string[]; // Array of user IDs
  createdBy: string; // Admin user ID
  createdAt: Date;
  updatedAt: Date;
}
// ============ User Management Types ============
export interface CreateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role?: "admin" | "user"; // Optional, defaults to "user"
}

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "admin" | "user";
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserResponse {
  success: boolean;
  data: {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: "admin" | "user";
    emailVerified: boolean;
  };
  message: string;
}

// ============ Error Types ============
export { ForbiddenError, BadRequestError, NotFoundError, InternalServerError } from "./errors.js";
