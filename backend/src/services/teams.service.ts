import mongoose from "mongoose";
import { TeamModel } from "../models/team.model.js";
import { UserModel } from "../models/user.model.js";

export type CreateTeamRequest = {
    teamName: string;
    description?: string;
    isPrivate?: boolean;
    members?: string[];
};

export class TeamsService {
    private teamModel: TeamModel;
    private userModel: UserModel;

    constructor() {
        this.teamModel = new TeamModel();
        this.userModel = new UserModel();
    }

    private async isUserAdmin(userId: string): Promise<boolean> {
        const user = await this.userModel.findById(userId);
        if (!user) return false;

        // Role is stored as string in user model
        return user.role === "admin";
    }

    private async validateUsers(userIds: string[]): Promise<void> {
        for (const userId of userIds) {
            const user = await this.userModel.findById(userId);
            if (!user) {
                throw new Error(`User with ID ${userId} does not exist`);
            }
        }
    }

    async createTeam(data: CreateTeamRequest, creatorId: string) {
        if (!data.teamName || data.teamName.trim().length === 0) {
            throw new Error("Team name is required");
        }

        const isPrivate = data.isPrivate === true;
        const memberIds = new Set<string>([creatorId]);

        if (isPrivate && Array.isArray(data.members)) {
            for (const memberId of data.members) {
                if (mongoose.Types.ObjectId.isValid(memberId)) {
                    memberIds.add(memberId);
                }
            }
        }

        await this.validateUsers(Array.from(memberIds));

        const created = await this.teamModel.create({
            teamName: data.teamName.trim(),
            description: (data.description || "").trim(),
            isPrivate,
            members: Array.from(memberIds).map((id) => new mongoose.Types.ObjectId(id)),
            createdBy: new mongoose.Types.ObjectId(creatorId),
        });

        const hydrated = await this.teamModel.findById(created._id.toString());
        if (!hydrated) {
            throw new Error("Failed to load created team");
        }

        return {
            success: true,
            data: {
                _id: hydrated._id.toString(),
                teamName: hydrated.teamName,
                description: hydrated.description || "",
                isPrivate: hydrated.isPrivate,
                members: (hydrated.members as any[]).map((member: any) => ({
                    _id: member._id?.toString() || member,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    email: member.email,
                })),
                createdBy: {
                    _id: (hydrated.createdBy as any)._id?.toString() || hydrated.createdBy,
                    firstName: (hydrated.createdBy as any).firstName,
                    lastName: (hydrated.createdBy as any).lastName,
                    email: (hydrated.createdBy as any).email,
                },
                createdAt: hydrated.createdAt,
                updatedAt: hydrated.updatedAt,
            },
            message: "Team created successfully",
        };
    }

    async getVisibleTeams(userId: string) {
        const isAdmin = await this.isUserAdmin(userId);
        const teams = await this.teamModel.findVisibleForUser(userId, isAdmin);

        return {
            success: true,
            data: teams.map((team) => ({
                _id: team._id.toString(),
                teamName: team.teamName,
                description: team.description || "",
                isPrivate: team.isPrivate,
                members: (team.members as any[]).map((member: any) => ({
                    _id: member._id?.toString() || member,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    email: member.email,
                })),
                createdBy: {
                    _id: (team.createdBy as any)._id?.toString() || team.createdBy,
                    firstName: (team.createdBy as any).firstName,
                    lastName: (team.createdBy as any).lastName,
                    email: (team.createdBy as any).email,
                },
                createdAt: team.createdAt,
                updatedAt: team.updatedAt,
            })),
            message: "Teams retrieved successfully",
        };
    }

    async getTeamById(teamId: string, userId: string) {
        if (!mongoose.Types.ObjectId.isValid(teamId)) {
            throw new Error("Invalid team ID");
        }

        const team = await this.teamModel.findById(teamId);
        if (!team) {
            throw new Error("Team not found");
        }

        // Check if user has access to this team
        const isAdmin = await this.isUserAdmin(userId);
        const isMember = (team.members as any[]).some(
            (member: any) => member._id?.toString() === userId || member === userId
        );
        const isCreator = (team.createdBy as any)._id?.toString() === userId || team.createdBy === userId;

        if (team.isPrivate && !isMember && !isCreator && !isAdmin) {
            throw new Error("Access denied - you don't have permission to view this team");
        }

        return {
            success: true,
            data: {
                _id: team._id.toString(),
                teamName: team.teamName,
                description: team.description || "",
                isPrivate: team.isPrivate,
                members: (team.members as any[]).map((member: any) => ({
                    _id: member._id?.toString() || member,
                    firstName: member.firstName,
                    lastName: member.lastName,
                    email: member.email,
                })),
                createdBy: {
                    _id: (team.createdBy as any)._id?.toString() || team.createdBy,
                    firstName: (team.createdBy as any).firstName,
                    lastName: (team.createdBy as any).lastName,
                    email: (team.createdBy as any).email,
                },
                createdAt: team.createdAt,
                updatedAt: team.updatedAt,
            },
            message: "Team retrieved successfully",
        };
    }

    async updateTeam(
        teamId: string,
        userId: string,
        data: { teamName?: string; description?: string; isPrivate?: boolean }
    ) {
        if (!mongoose.Types.ObjectId.isValid(teamId)) {
            throw new Error("Invalid team ID");
        }

        const team = await this.teamModel.findById(teamId);
        if (!team) {
            throw new Error("Team not found");
        }

        const isAdmin = await this.isUserAdmin(userId);
        const isCreator = (team.createdBy as any)._id?.toString() === userId || team.createdBy === userId;

        if (!isAdmin && !isCreator) {
            throw new Error("Only admin or team creator can update this team");
        }

        const updates: any = {};
        if (data.teamName) updates.teamName = data.teamName.trim();
        if (data.description !== undefined) updates.description = data.description.trim();
        if (data.isPrivate !== undefined) updates.isPrivate = data.isPrivate;

        const updated = await this.teamModel.findByIdAndUpdate(teamId, updates);
        if (!updated) {
            throw new Error("Failed to update team");
        }

        return {
            success: true,
            message: "Team updated successfully",
        };
    }

    async deleteTeam(teamId: string, userId: string) {
        if (!mongoose.Types.ObjectId.isValid(teamId)) {
            throw new Error("Invalid team ID");
        }

        const team = await this.teamModel.findById(teamId);
        if (!team) {
            throw new Error("Team not found");
        }

        const isAdmin = await this.isUserAdmin(userId);
        const isCreator = (team.createdBy as any)._id?.toString() === userId || team.createdBy === userId;

        if (!isAdmin && !isCreator) {
            throw new Error("Only admin or team creator can delete this team");
        }

        await this.teamModel.deleteById(teamId);

        return {
            success: true,
            message: "Team deleted successfully",
        };
    }

    async addMember(teamId: string, userId: string, memberId: string) {
        if (!mongoose.Types.ObjectId.isValid(teamId)) {
            throw new Error("Invalid team ID");
        }

        const team = await this.teamModel.findById(teamId);
        if (!team) {
            throw new Error("Team not found");
        }

        const isAdmin = await this.isUserAdmin(userId);
        const isCreator = (team.createdBy as any)._id?.toString() === userId || team.createdBy === userId;

        if (!isAdmin && !isCreator) {
            throw new Error("Only admin or team creator can add members");
        }

        // Check if member user exists
        const memberUser = await this.userModel.findById(memberId);
        if (!memberUser) {
            throw new Error("User not found");
        }

        // Check if already a member
        const isMember = (team.members as any[]).some(
            (member: any) => member._id?.toString() === memberId || member === memberId
        );
        if (isMember) {
            throw new Error("User is already a member of this team");
        }

        // Add member
        const memberObjectId = new mongoose.Types.ObjectId(memberId);
        await this.teamModel.addMember(teamId, memberObjectId);

        return {
            success: true,
            message: "Member added successfully",
        };
    }

    async removeMember(teamId: string, userId: string, memberId: string) {
        if (!mongoose.Types.ObjectId.isValid(teamId)) {
            throw new Error("Invalid team ID");
        }

        const team = await this.teamModel.findById(teamId);
        if (!team) {
            throw new Error("Team not found");
        }

        const isAdmin = await this.isUserAdmin(userId);
        const isCreator = (team.createdBy as any)._id?.toString() === userId || team.createdBy === userId;

        if (!isAdmin && !isCreator) {
            throw new Error("Only admin or team creator can remove members");
        }

        // Cannot remove the creator
        if ((team.createdBy as any)._id?.toString() === memberId || team.createdBy === memberId) {
            throw new Error("Cannot remove team creator");
        }

        // Remove member
        const memberObjectId = new mongoose.Types.ObjectId(memberId);
        await this.teamModel.removeMember(teamId, memberObjectId);

        return {
            success: true,
            message: "Member removed successfully",
        };
    }

    async leaveTeam(teamId: string, userId: string) {
        if (!mongoose.Types.ObjectId.isValid(teamId)) {
            throw new Error("Invalid team ID");
        }

        const team = await this.teamModel.findById(teamId);
        if (!team) {
            throw new Error("Team not found");
        }

        const isCreator = (team.createdBy as any)._id?.toString() === userId || team.createdBy === userId;

        if (isCreator && team.members.length === 1) {
            throw new Error("Team creator cannot leave a team with no other members. Delete the team instead.");
        }

        // Remove member
        const userObjectId = new mongoose.Types.ObjectId(userId);
        await this.teamModel.removeMember(teamId, userObjectId);

        return {
            success: true,
            message: "You have left the team",
        };
    }
}
