export interface CreateTaskRequest {
  title: string;
  description: string;
  dueDate?: string;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: "pending" | "in-progress" | "completed";
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskResponse {
  success: boolean;
  data: Task;
  message: string;
}

export interface CreateTaskResponse {
  success: boolean;
  data: Task;
  message: string;
}

export interface GetTasksResponse {
  success: boolean;
  data: Task[];
  message: string;
}

export interface TaskDetailsResponse {
  success: boolean;
  data: Task;
  message: string;
}
