import { api } from "./http";
import type { CreateTeamRequest, TeamsResponse } from "../types/team";

export const teamsApi = {
    getTeams: async (): Promise<TeamsResponse> => {
        const response = await api.get("/teams");
        return response.data;
    },

    createTeam: async (data: CreateTeamRequest) => {
        const response = await api.post("/teams", data);
        return response.data;
    },
};
