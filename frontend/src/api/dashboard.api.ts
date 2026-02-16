import { api } from "./http";

export interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  totalUsers: number;
  tasksByStatus: {
    "to-do": number;
    "in-progress": number;
    "completed": number;
  };
}

export interface DashboardStatsResponse {
  success: boolean;
  data: DashboardStats;
}

export const dashboardApi = {
  getStats: async (projectId?: string) => {
    const response = await api.get<DashboardStatsResponse>("/dashboard/stats", {
      params: projectId ? { projectId } : undefined,
    });
    return response.data;
  },
};
