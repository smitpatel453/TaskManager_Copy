import { api } from "./http";
import type { CreateProjectRequest, ProjectsResponse, AllUsersResponse } from "../types/project";

export const projectsApi = {
  // Create a new project (admin only)
  createProject: async (data: CreateProjectRequest) => {
    const response = await api.post("/projects", data);
    return response.data;
  },

  // Get all projects (admin only)
  getAllProjects: async (): Promise<ProjectsResponse> => {
    const response = await api.get("/projects");
    return response.data;
  },

  // Get projects assigned to current user
  getMyProjects: async (): Promise<ProjectsResponse> => {
    const response = await api.get("/projects/my-projects");
    return response.data;
  },

  // Get all users for dropdown
  getAllUsersForDropdown: async (): Promise<AllUsersResponse> => {
    const response = await api.get("/projects/users/all");
    return response.data;
  },
};
