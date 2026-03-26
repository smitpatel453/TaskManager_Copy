export interface TeamMember {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
}

export interface Team {
    _id: string;
    teamName: string;
    description?: string;
    isPrivate: boolean;
    members: TeamMember[];
    createdBy: TeamMember;
    createdAt: string;
    updatedAt: string;
}

export interface CreateTeamRequest {
    teamName: string;
    description?: string;
    isPrivate: boolean;
    members: string[];
}

export interface TeamsResponse {
    success: boolean;
    data: Team[];
    message: string;
}
