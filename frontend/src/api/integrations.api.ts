import { api } from "./http";

export const integrationsApi = {
  getSlackAuthUrl: async () => {
    const response = await api.get("/integrations/slack/auth");
    return response.data;
  },

  getSlackChannels: async () => {
    const response = await api.get("/integrations/slack/channels");
    return response.data;
  },

  importSlackChannel: async (channelId: string, slackChannelId: string) => {
    const response = await api.post(`/channels/${channelId}/import-slack`, {
      slackChannelId,
    });
    return response.data;
  },
};
