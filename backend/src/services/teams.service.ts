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
        if (!user?.role) return false;

        const db = mongoose.connection.db;
        if (!db) return false;

        const adminRole = await db.collection("roles").findOne({ name: "admin" });
        if (!adminRole) return false;

        return user.role.toString() === adminRole._id.toString();
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
}
