import mongoose from "mongoose";
import { ProjectModel } from "../models/project.model.js";
import { TeamModel } from "../models/team.model.js";
import { UserModel } from "../models/user.model.js";
import type { CreateProjectRequest } from "../shared/types/index.js";

export class ProjectsService {
    private projectModel: ProjectModel;
    private teamModel: TeamModel;
    private userModel: UserModel;

    constructor() {
        this.projectModel = new ProjectModel();
        this.teamModel = new TeamModel();
        this.userModel = new UserModel();
    }

    /**
     * Check if a user is admin
     */
    private async isUserAdmin(userId: string): Promise<boolean> {
        try {
            const user = await this.userModel.findById(userId);
            if (!user || !user.role) {
                return false;
            }

            const db = mongoose.connection.db;
            if (!db) {
                return false;
            }

            const adminRole = await db.collection("roles").findOne({ name: "admin" });
            if (!adminRole) {
                return false;
            }

            return user.role.toString() === adminRole._id.toString();
        } catch (error) {
            console.error("Error checking admin status:", error);
            return false;
        }
    }

    /**
     * Validate assigned users exist
     */
    private async validateAssignedUsers(userIds: string[]): Promise<boolean> {
        if (!Array.isArray(userIds) || userIds.length === 0) {
            return true; // Empty array is valid
        }

        for (const userId of userIds) {
            const user = await this.userModel.findById(userId);
            if (!user) {
                throw new Error(`User with ID ${userId} does not exist`);
            }
        }

        return true;
    }

    /**
     * Create a new project (admin only)
     */
    async createProject(data: CreateProjectRequest, creatorId: string): Promise<any> {
        const isAdmin = await this.isUserAdmin(creatorId);

        // Validate project name
        if (!data.projectName || typeof data.projectName !== "string") {
            throw new Error("Project name is required");
        }

        if (data.projectName.trim().length === 0) {
            throw new Error("Project name cannot be empty");
        }

        if (!data.teamId || !mongoose.Types.ObjectId.isValid(data.teamId)) {
            throw new Error("Valid teamId is required");
        }

        const team = await this.teamModel.findById(data.teamId);
        if (!team) {
            throw new Error("Selected team does not exist");
        }

        const canCreateInTeam =
            isAdmin ||
            team.createdBy.toString() === creatorId ||
            (team.members || []).some((member) => member.toString() === creatorId);

        if (!canCreateInTeam) {
            throw new Error("You do not have access to create projects in this team");
        }

        const projectNameExists = await this.projectModel.existsByName(data.projectName);
        if (projectNameExists) {
            throw new Error("Project name already exists. Please use a unique name.");
        }

        // Validate project description
        if (!data.projectDescription || typeof data.projectDescription !== "string") {
            throw new Error("Project description is required");
        }

        if (data.projectDescription.trim().length === 0) {
            throw new Error("Project description cannot be empty");
        }

        // Validate assigned users
        await this.validateAssignedUsers(data.assignedUsers || []);

        // Create project
        const projectData = {
            projectName: data.projectName.trim(),
            projectDescription: data.projectDescription.trim(),
            teamId: new mongoose.Types.ObjectId(data.teamId),
            assignedUsers: (data.assignedUsers || []).map((id) => new mongoose.Types.ObjectId(id)),
            createdBy: new mongoose.Types.ObjectId(creatorId),
        };

        const result = await this.projectModel.create(projectData);

        return {
            success: true,
            data: {
                _id: result.insertedId,
                projectName: result.project.projectName,
                projectDescription: result.project.projectDescription,
                teamId: result.project.teamId,
                assignedUsers: result.project.assignedUsers,
                createdBy: result.project.createdBy,
                createdAt: result.project.createdAt,
                updatedAt: result.project.updatedAt,
            },
            message: "Project created successfully",
        };
    }

    /**
     * Get all projects (admin only)
     */
    async getAllProjects(adminId: string): Promise<any> {
        const isAdmin = await this.isUserAdmin(adminId);
        if (!isAdmin) {
            throw new Error("Only admins can view all projects");
        }

        const projects = await this.projectModel.findAll();

        return {
            success: true,
            data: projects.map((project) => ({
                _id: project._id.toString(),
                projectName: project.projectName,
                projectDescription: project.projectDescription,
                team: {
                    _id: (project.teamId as any)?._id?.toString() || project.teamId,
                    teamName: (project.teamId as any)?.teamName || "",
                },
                assignedUsers: (project.assignedUsers as any[]).map((user: any) => ({
                    _id: user._id?.toString() || user,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                })),
                createdBy: {
                    _id: (project.createdBy as any)._id?.toString() || project.createdBy,
                    firstName: (project.createdBy as any).firstName,
                    lastName: (project.createdBy as any).lastName,
                    email: (project.createdBy as any).email,
                },
                createdAt: project.createdAt,
                updatedAt: project.updatedAt,
            })),
            message: "Projects retrieved successfully",
        };
    }

    /**
     * Get projects assigned to a specific user
     */
    async getProjectsByUser(userId: string): Promise<any> {
        const user = await this.userModel.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const projects = await this.projectModel.findByAssignedUser(userId);

        return {
            success: true,
            data: projects.map((project) => ({
                _id: project._id.toString(),
                projectName: project.projectName,
                projectDescription: project.projectDescription,
                team: {
                    _id: (project.teamId as any)?._id?.toString() || project.teamId,
                    teamName: (project.teamId as any)?.teamName || "",
                },
                assignedUsers: (project.assignedUsers as any[]).map((user: any) => ({
                    _id: user._id?.toString() || user,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                })),
                createdBy: {
                    _id: (project.createdBy as any)._id?.toString() || project.createdBy,
                    firstName: (project.createdBy as any).firstName,
                    lastName: (project.createdBy as any).lastName,
                    email: (project.createdBy as any).email,
                },
                createdAt: project.createdAt,
                updatedAt: project.updatedAt,
            })),
            message: "Projects retrieved successfully",
        };
    }

    /**
     * Get all available users for assignment dropdown
     */
    async getAllUsers(): Promise<any> {
        try {
            const db = mongoose.connection.db;
            if (!db) {
                throw new Error("Database connection failed");
            }

            const users = await db.collection("users").find({}).project({ firstName: 1, lastName: 1, email: 1, _id: 1 }).toArray();

            return {
                success: true,
                data: users.map((user) => ({
                    _id: user._id.toString(),
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    fullName: `${user.firstName} ${user.lastName}`,
                })),
                message: "Users retrieved successfully",
            };
        } catch (error) {
            console.error("Error fetching users:", error);
            throw new Error("Failed to fetch users");
        }
    }
}

