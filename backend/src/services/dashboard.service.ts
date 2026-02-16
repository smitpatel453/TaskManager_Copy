import mongoose from "mongoose";
import { UserModel } from "../models/user.model.js";

export class DashboardService {
  private userModel: UserModel;

  constructor() {
    this.userModel = new UserModel();
  }

  async getStats(userId: string, projectId?: string): Promise<any> {
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection failed");
    }

    // Check if user is admin
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const rolesCollection = db.collection("roles");
    const adminRole = await rolesCollection.findOne({ name: "admin" });
    
    if (!adminRole || !user.role || user.role.toString() !== adminRole._id.toString()) {
      throw new Error("Access denied. Admin only.");
    }

    // Get statistics
    const projectsCollection = db.collection("projects");
    const tasksCollection = db.collection("TaskManager");
    const usersCollection = db.collection("users");

    const taskMatch: Record<string, unknown> = {};
    if (projectId) {
      if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Invalid projectId");
      }
      taskMatch.projectId = new mongoose.Types.ObjectId(projectId);
    }

    const [totalProjects, totalTasks, totalUsers, tasksByStatus] = await Promise.all([
      projectsCollection.countDocuments(),
      tasksCollection.countDocuments(taskMatch),
      usersCollection.countDocuments(),
      tasksCollection.aggregate([
        ...(Object.keys(taskMatch).length > 0 ? [{ $match: taskMatch }] : []),
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ]).toArray()
    ]);

    // Transform task status data
    const statusCounts = {
      "to-do": 0,
      "in-progress": 0,
      "completed": 0
    };

    tasksByStatus.forEach((item: any) => {
      if (item._id in statusCounts) {
        statusCounts[item._id as keyof typeof statusCounts] = item.count;
      }
    });

    return {
      success: true,
      data: {
        totalProjects,
        totalTasks,
        totalUsers,
        tasksByStatus: statusCounts
      }
    };
  }
}
