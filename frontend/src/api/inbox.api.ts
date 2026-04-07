import { api } from "./http";

export interface InboxMessage {
  _id: string;
  recipientId: string;
  senderId?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  taskId: string;
  taskName: string;
  type: "task-assigned" | "task-status-changed";
  title: string;
  message: string;
  previousStatus?: "to-do" | "in-progress" | "completed";
  newStatus?: "to-do" | "in-progress" | "completed";
  isRead: boolean;
  createdAt: string;
}

export interface InboxResponse {
  messages: InboxMessage[];
  total: number;
  unreadCount: number;
  skip: number;
  limit: number;
}

export const inboxApi = {
  getMessages: async (limit: number = 50, skip: number = 0) => {
    const response = await api.get<InboxResponse>("/inbox", {
      params: { limit, skip },
    });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get<{ unreadCount: number }>("/inbox/unread/count");
    return response.data;
  },

  markMessageAsRead: async (messageId: string) => {
    const response = await api.patch(`/inbox/${messageId}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch("/inbox/read/all");
    return response.data;
  },

  deleteMessage: async (messageId: string) => {
    const response = await api.delete(`/inbox/${messageId}`);
    return response.data;
  },
};
