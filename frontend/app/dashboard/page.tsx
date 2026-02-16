"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { dashboardApi } from "../../src/api/dashboard.api";
import { projectsApi } from "../../src/api/projects.api";

const PROJECT_COLORS = [
  "#F59E0B", // amber
  "#EF4444", // red
  "#10B981", // green
  "#6366F1", // indigo
  "#EC4899", // pink
  "#8B5CF6", // violet
  "#14B8A6", // teal
  "#F97316", // orange
];

export default function DashboardPage() {
  const [user, setUser] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    role?: string;
  } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        /* ignore */
      }
    }
  }, []);

  const isAdmin = user?.role === "admin";

  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: dashboardApi.getStats,
    enabled: isAdmin,
    staleTime: 5 * 60 * 1000,
  });

  const { data: projectsData } = useQuery({
    queryKey: ["projects", isAdmin ? "admin" : "user"],
    queryFn: isAdmin ? projectsApi.getAllProjects : projectsApi.getMyProjects,
    enabled: true,
    staleTime: 5 * 60 * 1000,
  });

  const projects = projectsData?.data || [];

  const tasksByStatus = useMemo(() => {
    if (!stats?.data?.tasksByStatus) return [];
    return Object.entries(stats.data.tasksByStatus).map(([key, count]) => ({
      _id: key,
      count: count as number,
    }));
  }, [stats]);

  const totalTasks = useMemo(
    () => tasksByStatus.reduce((sum, s) => sum + s.count, 0),
    [tasksByStatus]
  );

  const statusColorMap: Record<string, string> = {
    "to-do": "#9CA3AF",
    "in-progress": "#3B82F6",
    completed: "#10B981",
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: OverviewIcon },
    { id: "list", label: "List", icon: ListIcon },
    { id: "board", label: "Board", icon: BoardIcon },
  ];

  const handleTabClick = (tabId: string) => {
    // Tab switching functionality for future implementation
    // Current tab: Overview is the default
  };

  return (
    <div>


      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-[var(--border-subtle)] -mx-6 px-6 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
              tab.id === "overview"
                ? "border-[var(--text-primary)] text-[var(--text-primary)]"
                : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            <tab.icon active={tab.id === "overview"} />
            {tab.label}
          </button>
        ))}
        <button className="flex items-center gap-1 px-3.5 py-2.5 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border-b-2 border-transparent transition-colors">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
          View
        </button>
      </div>

      {/* Info Bar */}
      <div className="flex items-center justify-between mb-6 text-[13px]">
        <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          <span>Filters</span>
        </div>
        <div className="flex items-center gap-4 text-[var(--text-muted)]">
          <span className="text-[12px]">
            {new Date().toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* TOP CARDS ROW: Recent + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Recent Card */}
        <OverviewCard title="Recent">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-[var(--text-muted)] text-[13px]">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 opacity-40">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              No recent items
            </div>
          ) : (
            <div className="space-y-0.5">
              {projects.slice(0, 5).map((project, i) => (
                <Link
                  key={project._id}
                  href={`/dashboard/tasks?project=${project._id}`}
                  prefetch={false}
                  className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-[var(--bg-surface-2)] transition-colors group"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={PROJECT_COLORS[i % PROJECT_COLORS.length]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                  </svg>
                  <span className="text-[13px] text-[var(--text-primary)] group-hover:text-[var(--text-primary)] truncate font-medium">
                    {project.projectName}
                  </span>
                  <span className="text-[12px] text-[var(--text-muted)] ml-auto flex-shrink-0">
                    • in Workspace
                  </span>
                </Link>
              ))}
            </div>
          )}
        </OverviewCard>

        {/* Admin stat cards */}
        {isAdmin && stats?.data ? (
          <>
            <OverviewCard title="Workspace Stats">
              <div className="space-y-4 py-2">
                <StatRow label="Total Projects" value={stats.data.totalProjects ?? 0} icon="📁" color="#F59E0B" />
                <StatRow label="Total Tasks" value={stats.data.totalTasks ?? 0} icon="📋" color="#6366F1" />
                <StatRow label="Total Users" value={stats.data.totalUsers ?? 0} icon="👥" color="#10B981" />
              </div>
            </OverviewCard>

            {/* Workload by Status – Donut Chart */}
            <OverviewCard title="Workload by Status">
              {tasksByStatus.length > 0 ? (
                <div className="flex items-center justify-center py-3">
                  <div className="relative">
                    <svg width="140" height="140" viewBox="0 0 140 140">
                      {(() => {
                        let cumulativePercent = 0;
                        return tasksByStatus.map((item, idx) => {
                          const percent = totalTasks > 0 ? item.count / totalTasks : 0;
                          const startAngle = cumulativePercent * 360;
                          const endAngle = (cumulativePercent + percent) * 360;
                          cumulativePercent += percent;
                          const r = 55;
                          const cx = 70;
                          const cy = 70;
                          const startRad = ((startAngle - 90) * Math.PI) / 180;
                          const endRad = ((endAngle - 90) * Math.PI) / 180;
                          const x1 = cx + r * Math.cos(startRad);
                          const y1 = cy + r * Math.sin(startRad);
                          const x2 = cx + r * Math.cos(endRad);
                          const y2 = cy + r * Math.sin(endRad);
                          const largeArc = percent > 0.5 ? 1 : 0;
                          const color = statusColorMap[item._id] || "#9CA3AF";
                          if (percent === 0) return null;
                          return (
                            <path
                              key={idx}
                              d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`}
                              fill={color}
                              stroke="var(--bg-canvas)"
                              strokeWidth="2"
                              className="transition-all duration-500"
                            />
                          );
                        });
                      })()}
                      {/* Inner circle for donut effect */}
                      <circle cx="70" cy="70" r="32" fill="var(--bg-canvas)" />
                      <text x="70" y="66" textAnchor="middle" fill="var(--text-primary)" fontSize="18" fontWeight="700">
                        {totalTasks}
                      </text>
                      <text x="70" y="82" textAnchor="middle" fill="var(--text-muted)" fontSize="10">
                        tasks
                      </text>
                    </svg>
                  </div>
                  <div className="ml-4 space-y-2">
                    {tasksByStatus.map((item) => (
                      <div key={item._id} className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: statusColorMap[item._id] || "#9CA3AF" }}
                        />
                        <span className="text-[11px] text-[var(--text-secondary)] uppercase tracking-wide">
                          {item._id}
                        </span>
                        <span className="text-[11px] font-semibold text-[var(--text-primary)] ml-1">
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-[var(--text-muted)] text-[12px]">
                  No tasks yet
                </div>
              )}
            </OverviewCard>
          </>
        ) : (
          <>
            {/* Non-admin: quick action cards */}
            <OverviewCard title="Quick Actions">
              <div className="space-y-2 py-2">
                <Link
                  href="/dashboard/tasks"
                  prefetch={false}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg-surface-2)] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                    📋
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-[var(--text-primary)]">My Tasks</p>
                    <p className="text-[11px] text-[var(--text-muted)]">View and manage tasks</p>
                  </div>
                </Link>
                <Link
                  href="/dashboard/tasks?filter=assigned"
                  prefetch={false}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--bg-surface-2)] transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                    📌
                  </div>
                  <div>
                    <p className="text-[12px] font-medium text-[var(--text-primary)]">Assigned to Me</p>
                    <p className="text-[11px] text-[var(--text-muted)]">Tasks assigned to you</p>
                  </div>
                </Link>
              </div>
            </OverviewCard>
            <OverviewCard title="Info">
              <div className="flex flex-col items-center justify-center py-8 text-[var(--text-muted)] text-[12px]">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mb-2 opacity-40">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
                Stay on top of your work
              </div>
            </OverviewCard>
          </>
        )}
      </div>
    </div>
  );
}

/* ─── Sub-components ─────────────────────────────────────── */

function OverviewCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] overflow-hidden hover:shadow-soft-lg transition-shadow">
      <div className="px-4 py-2.5 border-b border-[var(--border-subtle)]">
        <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">{title}</h3>
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  );
}

function StatRow({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
          style={{ backgroundColor: color + "18" }}
        >
          {icon}
        </div>
        <span className="text-[13px] text-[var(--text-secondary)] font-medium">{label}</span>
      </div>
      <span className="text-[18px] font-bold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

/* Tab icons */
function OverviewIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function ListIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}

function BoardIcon({ active }: { active: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? "2.2" : "1.8"} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2" ry="2" /><line x1="4" y1="9" x2="20" y2="9" /><line x1="10" y1="9" x2="10" y2="21" />
    </svg>
  );
}
