import { api } from './http';

export interface VideoCallToken {
    token: string;
    url: string;
    roomName: string;
    channelId: string;
    callId?: string;
    recordingEnabled?: boolean;
}

export interface CallInfo {
    hasActiveCall: boolean;
    activeCall: {
        roomName: string;
        startedAt: string;
        participants: Array<{
            _id: string;
            firstName: string;
            lastName: string;
        }>;
    } | null;
}

export interface CallHistory {
    _id: string;
    channelId: string;
    roomName: string;
    initiatorId: { _id: string; firstName: string; lastName: string; email: string };
    participantIds: Array<{ _id: string; firstName: string; lastName: string; email: string }>;
    startedAt: string;
    endedAt?: string;
    duration: number;
    recordingUrl?: string;
    recordingEnabled: boolean;
}

export interface CallHistoryResponse {
    calls: CallHistory[];
    total: number;
    limit: number;
    skip: number;
}

export interface UserCallStats {
    initiatedCalls: number;
    participatedCalls: number;
    totalDuration: number;
    averageDuration: number;
    totalCalls: number;
}

export const videocallsApi = {
    // Start a new video call with optional recording
    startCall: async (channelId: string, recordingEnabled: boolean = false): Promise<VideoCallToken> => {
        const response = await api.post(`/videocalls/${channelId}/start-call`, { recordingEnabled });
        return response.data;
    },

    // Join an existing call
    joinCall: async (channelId: string): Promise<VideoCallToken> => {
        const response = await api.post(`/videocalls/${channelId}/join-call`);
        return response.data;
    },

    // Leave the call
    leaveCall: async (channelId: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.post(`/videocalls/${channelId}/leave-call`);
        return response.data;
    },

    // End the entire call
    endCall: async (channelId: string, callId: string): Promise<{ success: boolean; message: string; duration: number }> => {
        const response = await api.post(`/videocalls/${channelId}/end-call`, { callId });
        return response.data;
    },

    // Get call information
    getCallInfo: async (channelId: string): Promise<CallInfo> => {
        const response = await api.get(`/videocalls/${channelId}/call-info`);
        return response.data;
    },

    // Get call history for a channel
    getCallHistory: async (channelId: string, limit: number = 10, skip: number = 0): Promise<CallHistoryResponse> => {
        const response = await api.get(`/videocalls/${channelId}/history?limit=${limit}&skip=${skip}`);
        return response.data;
    },

    // Enable recording for active call
    enableRecording: async (channelId: string, callId: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.post(`/videocalls/${channelId}/enable-recording`, { callId });
        return response.data;
    },

    // Get user call statistics
    getUserCallStats: async (): Promise<UserCallStats> => {
        const response = await api.get('/videocalls/stats/user-stats');
        return response.data;
    },
};
