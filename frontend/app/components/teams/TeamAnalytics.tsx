"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { teamsApi } from "../../../src/api/teams.api";
import { projectsApi } from "../../../src/api/projects.api";
import { tasksApi } from "../../../src/api/tasks.api";

type TeamSummaryRow = {
    id: string;
    teamName: string;
    projectCount: number;
    worklogHours: number;
    completedTasks: number;
};

type MonthlySeriesRow = {
    month: string;
    worklogHours: number;
    completedTasks: number;
};

export default function TeamAnalytics() {
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("user");
        if (!stored) return;
        try {
            const userData = JSON.parse(stored);
            setIsAdmin(userData.role === "admin");
        } catch {
            setIsAdmin(false);
        }
    }, []);

    const { data: teamsData, isLoading: teamsLoading } = useQuery({
        queryKey: ["teams"],
        queryFn: teamsApi.getTeams,
        staleTime: 5 * 60 * 1000,
    });

    const { data: projectsData, isLoading: projectsLoading } = useQuery({
        queryKey: ["team-analytics-projects", isAdmin ? "admin" : "user"],
        queryFn: isAdmin ? projectsApi.getAllProjects : projectsApi.getMyProjects,
        staleTime: 5 * 60 * 1000,
    });

    const { data: tasksData, isLoading: tasksLoading } = useQuery({
        queryKey: ["team-analytics-tasks"],
        queryFn: () => tasksApi.getTasks(1, 500, "all"),
        staleTime: 2 * 60 * 1000,
    });

    const teams = teamsData?.data || [];
    const projects = projectsData?.data || [];
    const tasks = tasksData?.data || [];

    const monthlySeries = useMemo<MonthlySeriesRow[]>(() => {
        const now = new Date();
        const monthKeys: Array<{ key: string; label: string }> = [];

        for (let i = 5; i >= 0; i -= 1) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
            const label = date.toLocaleString("en-US", { month: "short" });
            monthKeys.push({ key, label });
        }

        const map = new Map<string, MonthlySeriesRow>(
            monthKeys.map((m) => [
                m.key,
                {
                    month: m.label,
                    worklogHours: 0,
                    completedTasks: 0,
                },
            ])
        );

        for (const task of tasks) {
            if (task.createdAt) {
                const created = new Date(task.createdAt);
                const createdKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}`;
                const createdRow = map.get(createdKey);
                if (createdRow) {
                    createdRow.worklogHours += Number(task.hours || 0);
                }
            }

            if (task.status === "completed" && task.updatedAt) {
                const done = new Date(task.updatedAt);
                const doneKey = `${done.getFullYear()}-${String(done.getMonth() + 1).padStart(2, "0")}`;
                const doneRow = map.get(doneKey);
                if (doneRow) {
                    doneRow.completedTasks += 1;
                }
            }
        }

        return monthKeys.map((m) => map.get(m.key) as MonthlySeriesRow);
    }, [tasks]);

    const teamSummary = useMemo<TeamSummaryRow[]>(() => {
        const projectsByTeam = new Map<string, string[]>();

        for (const team of teams) {
            projectsByTeam.set(team._id, []);
        }

        for (const project of projects) {
            const teamId = project.team?._id;
            if (!teamId) continue;
            const existing = projectsByTeam.get(teamId) || [];
            existing.push(project._id);
            projectsByTeam.set(teamId, existing);
        }

        return teams.map((team) => {
            const projectIds = new Set(projectsByTeam.get(team._id) || []);
            const teamTasks = tasks.filter((task) => !!task.projectId && projectIds.has(task.projectId));

            const worklogHours = teamTasks.reduce((sum, task) => sum + Number(task.hours || 0), 0);
            const completedTasks = teamTasks.filter((task) => task.status === "completed").length;

            return {
                id: team._id,
                teamName: team.teamName,
                projectCount: projectIds.size,
                worklogHours,
                completedTasks,
            };
        });
    }, [teams, projects, tasks]);

    const totals = useMemo(() => {
        const totalProjects = teamSummary.reduce((sum, row) => sum + row.projectCount, 0);
        const totalWorklogHours = teamSummary.reduce((sum, row) => sum + row.worklogHours, 0);
        const totalDoneTasks = teamSummary.reduce((sum, row) => sum + row.completedTasks, 0);
        return {
            totalProjects,
            totalWorklogHours,
            totalDoneTasks,
        };
    }, [teamSummary]);

    const isLoading = teamsLoading || projectsLoading || tasksLoading;

    if (isLoading) {
        return (
            <div className="border border-[var(--border-subtle)] rounded-xl p-5 bg-[var(--bg-canvas)] text-[13px] text-[var(--text-tertiary)]">
                Loading team analytics...
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <MetricCard label="Teams" value={teams.length} />
                <MetricCard label="Projects" value={totals.totalProjects} />
                <MetricCard label="Worklog Hours" value={totals.totalWorklogHours} />
                <MetricCard label="Work Done" value={totals.totalDoneTasks} />
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4">
                <div className="mb-4">
                    <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">Monthly Worklog and Work Done</h3>
                    <p className="text-[12px] text-[var(--text-tertiary)]">Last 6 months across all teams</p>
                </div>

                {monthlySeries.every((item) => item.worklogHours === 0 && item.completedTasks === 0) ? (
                    <p className="text-[13px] text-[var(--text-tertiary)] py-8 text-center">No monthly data to display yet.</p>
                ) : (
                    <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlySeries}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                                <XAxis dataKey="month" stroke="var(--text-muted)" fontSize={11} />
                                <YAxis stroke="var(--text-muted)" fontSize={11} />
                                <Tooltip
                                    contentStyle={{
                                        borderRadius: 10,
                                        border: "1px solid var(--border-subtle)",
                                        background: "var(--bg-canvas)",
                                    }}
                                />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Bar dataKey="worklogHours" name="Worklog Hours" fill="#3B82F6" radius={[5, 5, 0, 0]} />
                                <Bar dataKey="completedTasks" name="Work Done" fill="#10B981" radius={[5, 5, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4">
                <h3 className="text-[15px] font-semibold text-[var(--text-primary)] mb-3">Team Project Workboard</h3>
                {teamSummary.length === 0 ? (
                    <p className="text-[13px] text-[var(--text-tertiary)]">No teams available.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[11px] uppercase tracking-wide text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
                                    <th className="py-2 pr-3">Team</th>
                                    <th className="py-2 pr-3">Projects</th>
                                    <th className="py-2 pr-3">Worklog Hours</th>
                                    <th className="py-2">Work Done</th>
                                </tr>
                            </thead>
                            <tbody>
                                {teamSummary.map((row) => (
                                    <tr key={row.id} className="text-[13px] text-[var(--text-primary)] border-b border-[var(--border-subtle)]/60 last:border-0">
                                        <td className="py-2.5 pr-3 font-medium">{row.teamName}</td>
                                        <td className="py-2.5 pr-3">{row.projectCount}</td>
                                        <td className="py-2.5 pr-3">{row.worklogHours}</td>
                                        <td className="py-2.5">{row.completedTasks}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

function MetricCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-4">
            <p className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</p>
            <p className="mt-2 text-[24px] font-bold text-[var(--text-primary)]">{value}</p>
        </div>
    );
}
