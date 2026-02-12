"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "../../src/api/dashboard.api";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error("Error parsing user data:", error);
        localStorage.removeItem("user");
      }
    }
  }, []);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => dashboardApi.getStats(),
    enabled: user?.role === "admin",
    staleTime: 5 * 60 * 1000,
  });

  const isAdmin = user?.role === "admin";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Welcome back!</h2>
        {user && (
          <div className="space-y-2">
            <p className="text-gray-700">
              <span className="font-medium">Name:</span> {user.firstName} {user.lastName}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Email:</span> {user.email}
            </p>
            <p className="text-gray-700">
              <span className="font-medium">Role:</span>{" "}
              <span className="capitalize">{user.role}</span>
            </p>
          </div>
        )}
      </div>

      {isAdmin && stats && (
        <>
          {/* Statistics Cards */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-lg shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Projects</p>
                  <p className="text-3xl font-bold mt-2">{stats.data.totalProjects}</p>
                </div>
                <div className="bg-blue-400/30 p-3 rounded-full">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-lg shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Tasks</p>
                  <p className="text-3xl font-bold mt-2">{stats.data.totalTasks}</p>
                </div>
                <div className="bg-green-400/30 p-3 rounded-full">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-lg shadow-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Total Users</p>
                  <p className="text-3xl font-bold mt-2">{stats.data.totalUsers}</p>
                </div>
                <div className="bg-purple-400/30 p-3 rounded-full">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Task Status Chart */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-6">Tasks by Status</h2>
            <TaskStatusChart tasksByStatus={stats.data.tasksByStatus} />
          </div>
        </>
      )}

      {!isAdmin && (
        <div className="grid gap-6 md:grid-cols-3">
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Tasks</h3>
            <p className="text-sm text-blue-700">
              Manage and track your tasks
            </p>
          </div>

          <div className="bg-green-50 p-6 rounded-lg border border-green-200">
            <h3 className="text-lg font-semibold text-green-900 mb-2">Projects</h3>
            <p className="text-sm text-green-700">
              View and manage projects
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskStatusChart({ tasksByStatus }: { tasksByStatus: { "to-do": number; "in-progress": number; "completed": number } }) {
  const total = tasksByStatus["to-do"] + tasksByStatus["in-progress"] + tasksByStatus["completed"];
  
  if (total === 0) {
    return <p className="text-gray-500 text-center py-8">No tasks yet</p>;
  }

  const todoPercent = (tasksByStatus["to-do"] / total) * 100;
  const inProgressPercent = (tasksByStatus["in-progress"] / total) * 100;
  const completedPercent = (tasksByStatus["completed"] / total) * 100;

  return (
    <div className="space-y-6">
      {/* Bar Chart */}
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">To Do</span>
            <span className="text-sm font-semibold text-gray-900">{tasksByStatus["to-do"]} ({todoPercent.toFixed(1)}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-gray-500 h-4 rounded-full transition-all duration-500" 
              style={{ width: `${todoPercent}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">In Progress</span>
            <span className="text-sm font-semibold text-gray-900">{tasksByStatus["in-progress"]} ({inProgressPercent.toFixed(1)}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-blue-500 h-4 rounded-full transition-all duration-500" 
              style={{ width: `${inProgressPercent}%` }}
            ></div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Completed</span>
            <span className="text-sm font-semibold text-gray-900">{tasksByStatus["completed"]} ({completedPercent.toFixed(1)}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-green-500 h-4 rounded-full transition-all duration-500" 
              style={{ width: `${completedPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Pie Chart (Using CSS) */}
      <div className="flex items-center justify-center gap-8 pt-4">
        <div className="relative w-48 h-48">
          <svg viewBox="0 0 100 100" className="transform -rotate-90">
            {/* To-do slice */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="#6B7280"
              strokeWidth="20"
              strokeDasharray={`${todoPercent * 2.51} ${251 - todoPercent * 2.51}`}
              strokeDashoffset="0"
            />
            {/* In-progress slice */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="#3B82F6"
              strokeWidth="20"
              strokeDasharray={`${inProgressPercent * 2.51} ${251 - inProgressPercent * 2.51}`}
              strokeDashoffset={`-${todoPercent * 2.51}`}
            />
            {/* Completed slice */}
            <circle
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke="#10B981"
              strokeWidth="20"
              strokeDasharray={`${completedPercent * 2.51} ${251 - completedPercent * 2.51}`}
              strokeDashoffset={`-${(todoPercent + inProgressPercent) * 2.51}`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{total}</p>
              <p className="text-xs text-gray-600">Total Tasks</p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-gray-500"></div>
            <span className="text-sm text-gray-700">To Do: {tasksByStatus["to-do"]}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-blue-500"></div>
            <span className="text-sm text-gray-700">In Progress: {tasksByStatus["in-progress"]}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span className="text-sm text-gray-700">Completed: {tasksByStatus["completed"]}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
