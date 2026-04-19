import { api } from "./http";
import type { AuthResponse } from "../types/auth";

export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post<AuthResponse>("/auth/login", { email, password });  
    return response.data;
  },

  signup: async (firstName: string, lastName: string, email: string, password: string, confirmPassword: string) => {
    const response = await api.post<AuthResponse>("/auth/signup", { 
      firstName, 
      lastName, 
      email, 
      password,
      confirmPassword
    });
    return response.data;
  },

  verifyEmail: async (token: string) => {
    const response = await api.get<{ success: boolean; message: string }>("/auth/verify-email", {
      params: { token },
    });
    return response.data;
  },

  changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    const response = await api.post<{ success: boolean; message: string }>("/auth/change-password", {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return response.data;
  },
  updateProfile: async (data: { firstName: string, lastName: string, avatar?: string }) => {
    const response = await api.patch<{ success: boolean; data: any; message: string }>("/users/profile", data);
    return response.data;
  },
};
