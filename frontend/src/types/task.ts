export interface DetailBlock {
  text: string;
  hours?: number;
  minutes?: number;
  time?: string; // HH:MM format
}

export type TaskStatus = "to-do" | "in-progress" | "completed";

export interface Task {
  _id: string;
  taskName: string;
  description?: string;
  hours: number;
  details: DetailBlock[];
  status: TaskStatus;
  priority?: "low" | "normal" | "high" | "urgent";
  projectId?: string;
  assignedTo?: string;
  startDate?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskRequest {
  taskName: string;
  description?: string;
  hours: number;
  details: DetailBlock[];
  status: TaskStatus;
  priority?: "low" | "normal" | "high" | "urgent";
  projectId?: string;
  assignedTo?: string;
  startDate?: string;
  dueDate?: string;
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
  ok: boolean;
  details: DetailBlock[];
  message?: string;
}
