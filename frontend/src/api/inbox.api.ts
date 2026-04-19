import { api } from "./http";

export interface Reply {
  senderId: string;
  senderName: string;
  message: string;
  createdAt: string;
}

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
  type: "task-assigned" | "task-status-changed" | "mention" | "comment_reply";
  title: string;
  message: string;
  previousStatus?: "to-do" | "in-progress" | "completed";
  newStatus?: "to-do" | "in-progress" | "completed";
  isRead: boolean;
  createdAt: string;
  replies?: Reply[];
}

export interface InboxResponse {
  messages: InboxMessage[];
  total: number;
  unreadCount: number;
  skip: number;
  limit: number;
}

export const inboxApi = {
  getMessages: async (limit: number = 50, skip: number = 0, type: string = "all") => {
    const response = await api.get<InboxResponse>("/inbox", {
      params: { limit, skip, type },
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

  addReply: async (messageId: string, message: string) => {
    const response = await api.post(`/inbox/${messageId}/reply`, { message });
    return response.data;
  },

  createMention: async (mentionedUserId: string, taskId: string, taskName: string) => {
    const response = await api.post("/inbox/mention/create", {
      mentionedUserId,
      taskId,
      taskName
    });
    return response.data;
  },
};
