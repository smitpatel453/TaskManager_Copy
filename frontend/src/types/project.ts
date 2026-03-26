export interface CreateProjectRequest {
  projectName: string;
  projectDescription: string;
  assignedUsers: string[];
  teamId: string;
}

export interface TeamInfo {
  _id: string;
  teamName: string;
}

export interface Project {
  _id: string;
  projectName: string;
  projectDescription: string;
  team?: TeamInfo;
  assignedUsers: UserInfo[];
  createdBy: UserInfo;
  createdAt: string;
  updatedAt: string;
}

export interface UserInfo {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface ProjectsResponse {
  success: boolean;
  data: Project[];
  message: string;
}

export interface AllUsersResponse {
  success: boolean;
  data: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    fullName: string;
  }>;
  message: string;
}
