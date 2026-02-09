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
  };
  message: string;
}

// ============ Task Types ============
export interface DetailBlock {
  text: string;
  time: string; // "HH:MM"
}

export interface CreateTaskRequest {
  taskName: string;
  hours: number;
  details: DetailBlock[];
}

export interface Task {
  _id: string;
  taskName: string;
  hours: number;
  details: DetailBlock[];
  createdAt: Date;
  updatedAt: Date;
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
  data: Task;
  message: string;
}
