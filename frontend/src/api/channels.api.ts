import { api } from "./http";

export type ChannelUser = {
    _id: string;
    firstName: string;
    lastName: string;
    email?: string;
};

export type ChannelAttachment = {
    fileName: string;
    url: string;
    mimeType: string;
    size: number;
};

export type ChannelMessage = {
    _id: string;
    channelId: string;
    text: string;
    sender: ChannelUser | null;
    mentions: ChannelUser[];
    attachments: ChannelAttachment[];
    createdAt: string;
    updatedAt: string;
};

export type Channel = {
    id: string;
    name: string;
    isPrivate: boolean;
    members: ChannelUser[];
    joinedMembers: ChannelUser[];
    createdBy: string;
    joinedMemberIds: string[];
    joined: boolean;
};

export const channelsApi = {
    getChannels: async () => {
        const response = await api.get<Channel[]>("/channels");
        return response.data;
    },

    createChannel: async (data: { name: string; isPrivate: boolean; members: string[] }) => {
        const response = await api.post<Channel>("/channels", data);
        return response.data;
    },

    getChannel: async (channelId: string) => {
        const response = await api.get<Channel>(`/channels/${channelId}`);
        return response.data;
    },

    joinChannel: async (channelId: string) => {
        const response = await api.post<Channel>(`/channels/${channelId}/join`);
        return response.data;
    },

    addMember: async (channelId: string, memberId: string) => {
        const response = await api.post<Channel>(`/channels/${channelId}/members`, { memberId });
        return response.data;
    },

    getUsers: async () => {
        const response = await api.get<ChannelUser[]>("/channels/users");
        return response.data;
    },

    getMessages: async (channelId: string) => {
        const response = await api.get<ChannelMessage[]>(`/channels/${channelId}/messages`);
        return response.data;
    },

    sendMessage: async (
        channelId: string,
        data: {
            text?: string;
            mentions?: string[];
            attachments?: ChannelAttachment[];
        }
    ) => {
        const response = await api.post<ChannelMessage>(`/channels/${channelId}/messages`, data);
        return response.data;
    },

    uploadFiles: async (channelId: string, files: File[]) => {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));

        const response = await api.post<ChannelAttachment[]>(`/channels/${channelId}/uploads`, formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    },

    getMentionSuggestions: async (channelId: string, query = "") => {
        const response = await api.get<ChannelUser[]>(`/channels/${channelId}/mentions`, {
            params: { q: query },
        });
        return response.data;
    },
};
