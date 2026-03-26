"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { projectsApi } from "../../../src/api/projects.api";
import { teamsApi } from "../../../src/api/teams.api";
import type { Project } from "../../../src/types/project";
import { SkeletonProjectsTable } from "../Skeleton";

export default function ProjectsClient({ userRole }: { userRole?: "admin" | "user" }) {
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  // Inline add state
  const [isAdding, setIsAdding] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectTeamId, setNewProjectTeamId] = useState("");
  const [newProjectUsers, setNewProjectUsers] = useState<string[]>([]);
  const [usersDropdownOpen, setUsersDropdownOpen] = useState(false);
  const [projectError, setProjectError] = useState<string>("");
  const usersDropdownRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = userRole === "admin";

  // Get user ID from localStorage
  const getUserIdFromStorage = () => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return user.userId;
      } catch {
        return null;
      }
    }
    return null;
  };

  useEffect(() => {
    const userId = getUserIdFromStorage();
    setCurrentUserId(userId);
  }, []);

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", isAdmin ? "admin" : "user"],
    queryFn: isAdmin ? projectsApi.getAllProjects : projectsApi.getMyProjects,
    enabled: !!userRole,
    staleTime: 5 * 60 * 1000,
  });

  const { data: usersData } = useQuery({
    queryKey: ["users-dropdown"],
    queryFn: projectsApi.getAllUsersForDropdown,
    enabled: isAdmin && isAdding,
    staleTime: 5 * 60 * 1000,
  });

  const { data: teamsData } = useQuery({
    queryKey: ["teams"],
    queryFn: teamsApi.getTeams,
    enabled: isAdding,
    staleTime: 5 * 60 * 1000,
  });

  const createProjectMutation = useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setIsAdding(false);
      setNewProjectName("");
      setNewProjectDesc("");
      setNewProjectTeamId("");
      setNewProjectUsers([]);
      setProjectError("");
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.error || error?.message || "Failed to create project";
      setProjectError(errorMessage);
      setIsAdding(true);
      console.error("Failed to create project:", error);
    },
  });

  const handleCreateProject = () => {
    setProjectError("");

    if (!newProjectName.trim()) {
      setProjectError("Project name is required");
      return;
    }
    if (!newProjectDesc.trim()) {
      setProjectError("Description is required");
      return;
    }

    if (!newProjectTeamId) {
      setProjectError("Please select a team");
      return;
    }

    if (newProjectUsers.length === 0) {
      setProjectError("Please select at least one user to assign to the project");
      return;
    }

    // Check if admin is trying to assign the project to themselves
    if (isAdmin) {
      // Get current user ID from storage
      const userId = currentUserId || getUserIdFromStorage();

      if (!userId) {
        setProjectError("Unable to verify current user. Please refresh the page.");
        return;
      }

      if (newProjectUsers.includes(userId)) {
        setProjectError("You cannot assign a project to yourself");
        return;
      }
    }

    createProjectMutation.mutate({
      projectName: newProjectName,
      projectDescription: newProjectDesc,
      teamId: newProjectTeamId,
      assignedUsers: newProjectUsers,
    });
  };

  const toggleUser = (userId: string) => {
    // Get current user ID
    const myUserId = currentUserId || getUserIdFromStorage();

    // Prevent admin from selecting themselves
    if (isAdmin && userId === myUserId) {
      setProjectError("You cannot assign a project to yourself");
      return;
    }

    setProjectError("");
    setNewProjectUsers(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (usersDropdownRef.current && !usersDropdownRef.current.contains(event.target as Node)) {
        setUsersDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isAdding && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [isAdding]);

  if (projectsLoading) {
    return (
      <div className="space-y-0">
        <div className="border-b border-[var(--border-subtle)] pb-0 -mx-6 px-6 -mt-6 pt-4 bg-[var(--bg-canvas)]">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-5 h-5 rounded bg-green-600 opacity-30" />
            <div className="skeleton skeleton-lg" style={{ width: 120 }} />
          </div>
        </div>
        <div className="mt-4 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-canvas)] shadow-sm">
          <div className="grid grid-cols-[1fr_180px_160px_120px] gap-2 items-center px-8 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide rounded-t-lg">
            <div>Project Name</div><div>Created By</div><div>Assigned Users</div><div>Created</div>
          </div>
          <SkeletonProjectsTable rows={6} />
        </div>
      </div>
    );
  }

  const projects = projectsData?.data || [];
  const allUsers = usersData?.data || [];
  const teams = teamsData?.data || [];
  const users = allUsers.filter(u => u._id !== currentUserId);

  return (
    <div className="space-y-0">
      {/* Breadcrumb + View Tabs */}
      <div className="border-b border-[var(--border-subtle)] pb-0 -mx-6 px-6 -mt-6 pt-4 bg-[var(--bg-canvas)]">
        <div className="flex items-center gap-2.5 mb-3 text-[var(--text-tertiary)]">
          <div className="w-5 h-5 rounded bg-green-600 text-white flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <span className="font-semibold text-[var(--text-primary)] text-[16px]">
            {isAdmin ? "All Projects" : "My Projects"}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-[13px] text-[var(--text-tertiary)] font-medium">
            <button className="pb-3 border-b-2 border-[var(--ck-blue)] text-[var(--ck-blue)] flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
              List
            </button>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-3 pb-3">
              {/* Add Project button removed from here */}
            </div>
          )}
        </div>
      </div>


      {/* Projects Table */}
      <div className="mt-4 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-canvas)] shadow-sm">
        {/* Table Header */}
        <div className="grid grid-cols-[1fr_180px_160px_120px] gap-2 items-center px-8 py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide rounded-t-lg">
          <div>Project Name</div>
          <div>Created By</div>
          <div>Assigned Users</div>
          <div>Created</div>
        </div>

        {/* Rows */}
        {projects.length === 0 && !isAdding ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-b-lg">
            <div className="w-12 h-12 rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <p className="text-sm text-[var(--text-tertiary)] mb-4">
              {isAdmin ? "No projects yet. Create your first project." : "No projects assigned to you."}
            </p>
            {isAdmin && (
              <button
                onClick={() => { setIsAdding(true); setProjectError(""); }}
                className="ck-btn-primary flex items-center gap-2"
              >
                <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" className="octicon octicon-repo" fill="currentColor">
                  <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"></path>
                </svg>
                Create Project
              </button>
            )}
          </div>
        ) : (
          projects.map((project: Project) => {
            const isExpanded = expandedProjectId === project._id;

            return (
              <div key={project._id}>
                <div
                  onClick={() => setExpandedProjectId(isExpanded ? null : project._id)}
                  className="grid grid-cols-[1fr_180px_160px_120px] gap-2 items-center px-4 py-2.5 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-surface)] group text-[13px] bg-[var(--bg-canvas)] transition-colors cursor-pointer"
                >
                  {/* Name */}
                  <div className="flex items-center gap-3 pl-4">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-[var(--text-muted)] flex-shrink-0">
                      <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75ZM1.5 2.75a.25.25 0 0 1 .25-.25H5c.1 0 .2.05.264.113l.943 1.257c.335.447.843.704 1.383.75l-.001.065v.065H1.5v-2Zm0 3.5h13v7a.25.25 0 0 1-.25.25H1.75a.25.25 0 0 1-.25-.25v-7Z" />
                    </svg>
                    <span className="truncate font-medium text-[var(--text-primary)]">{project.projectName}</span>
                  </div>

                  {/* Created By */}
                  <div className="text-[12px] text-[var(--text-secondary)] truncate">
                    {project.createdBy?.firstName} {project.createdBy?.lastName}
                  </div>

                  {/* Assigned Users */}
                  <div className="flex items-center">
                    {project.assignedUsers?.length > 0 ? (
                      <div className="flex items-center -space-x-1.5">
                        {project.assignedUsers.slice(0, 4).map((u) => (
                          <div
                            key={u._id}
                            className="w-6 h-6 rounded-full bg-gray-700 text-white flex items-center justify-center text-[8px] font-bold border-2 border-[var(--bg-canvas)]"
                            title={`${u.firstName} ${u.lastName}`}
                          >
                            {u.firstName?.charAt(0)}{u.lastName?.charAt(0)}
                          </div>
                        ))}
                        {project.assignedUsers.length > 4 && (
                          <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[8px] font-bold border-2 border-[var(--bg-canvas)]">
                            +{project.assignedUsers.length - 4}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-[var(--text-muted)]">None</span>
                    )}
                  </div>

                  {/* Created */}
                  <div className="text-[12px] text-[var(--text-secondary)]">
                    {new Date(project.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="bg-[var(--bg-surface)] border-b border-[var(--border-subtle)] px-6 py-4">
                    <div className="flex gap-6 items-start">
                      {/* Left: Project properties */}
                      <div className="flex-1 min-w-0 space-y-2.5">
                        <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-3">{project.projectName}</h3>

                        {project.projectDescription && (
                          <div className="flex items-center gap-4 text-[13px]">
                            <span className="w-24 text-[var(--text-muted)] flex items-center gap-2 flex-shrink-0">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                              Description
                            </span>
                            <span className="text-[var(--text-primary)]">{project.projectDescription}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-[13px]">
                          <span className="w-24 text-[var(--text-muted)] flex items-center gap-2 flex-shrink-0">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            Created by
                          </span>
                          <span className="text-[var(--text-primary)]">{project.createdBy?.firstName} {project.createdBy?.lastName}</span>
                        </div>

                        <div className="flex items-center gap-4 text-[13px]">
                          <span className="w-24 text-[var(--text-muted)] flex items-center gap-2 flex-shrink-0">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                            Created on
                          </span>
                          <span className="text-[var(--text-primary)]">{new Date(project.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>

                        <div className="flex items-center gap-4 text-[13px]">
                          <span className="w-24 text-[var(--text-muted)] flex items-center gap-2 flex-shrink-0">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            Updated
                          </span>
                          <span className="text-[var(--text-primary)]">{new Date(project.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>

                        <div className="flex items-center gap-4 text-[13px]">
                          <span className="w-24 text-[var(--text-muted)] flex items-center gap-2 flex-shrink-0">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                            Members
                          </span>
                          <span className="text-[var(--text-primary)]">{project.assignedUsers?.length || 0} user{(project.assignedUsers?.length || 0) !== 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      {/* Right: Assigned Users — scrollable */}
                      <div className="w-[260px] flex-shrink-0 border-l border-[var(--border-subtle)] pl-5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Assigned Users</span>
                          <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-surface-2)] px-1.5 py-0.5 rounded-full">{project.assignedUsers?.length || 0}</span>
                        </div>

                        {project.assignedUsers?.length > 0 ? (
                          <div className="overflow-y-auto max-h-[160px] space-y-1 pr-1 ck-scrollbar">
                            {project.assignedUsers.map((u) => (
                              <div
                                key={u._id}
                                className="flex items-center gap-2 text-[12px] px-2 py-1.5 rounded-md hover:bg-[var(--bg-surface-2)] transition-colors"
                              >
                                <div className="w-5 h-5 rounded-full bg-gray-700 text-white flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                                  {u.firstName?.charAt(0)}{u.lastName?.charAt(0)}
                                </div>
                                <span className="flex-1 text-[var(--text-primary)] truncate">{u.firstName} {u.lastName}</span>
                                <span className="text-[10px] text-[var(--text-muted)] truncate">{u.email || 'Member'}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[12px] text-[var(--text-muted)] py-2">No users assigned.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Inline Add Project */}
        {isAdmin && (
          isAdding ? (
            <div className="grid grid-cols-[1fr_180px_160px_120px] gap-2 items-start px-4 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)] rounded-b-lg">
              <div className="flex flex-col gap-2 pl-4">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="Project Name"
                  className="bg-transparent outline-none text-[13px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--border-subtle)] rounded-md px-2 py-1 w-full"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                />
                <input
                  type="text"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  placeholder="Description (required)"
                  className="bg-transparent outline-none text-[11px] text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] border border-[var(--border-subtle)] rounded-md px-2 py-1 w-full"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                />
                <select
                  value={newProjectTeamId}
                  onChange={(e) => setNewProjectTeamId(e.target.value)}
                  className="bg-transparent outline-none text-[11px] text-[var(--text-secondary)] border border-[var(--border-subtle)] rounded-md px-2 py-1 w-full"
                >
                  <option value="">Select team</option>
                  {teams.map((team) => (
                    <option key={team._id} value={team._id}>{team.teamName}</option>
                  ))}
                </select>
              </div>

              {/* Created By */}
              <div className="text-[12px] text-[var(--text-secondary)] pt-1">
                Me
              </div>

              {/* Assigned Users Dropdown */}
              <div className="relative pt-0.5" ref={usersDropdownRef}>
                <button
                  onClick={() => setUsersDropdownOpen(!usersDropdownOpen)}
                  className="flex items-center gap-1.5 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-all outline-none w-full"
                >
                  {newProjectUsers.length > 0 ? (
                    <span className="truncate flex-1 text-left">{newProjectUsers.length} user{newProjectUsers.length !== 1 ? 's' : ''}</span>
                  ) : (
                    <span className="truncate flex-1 text-left text-[var(--text-muted)]">Assign users</span>
                  )}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-[var(--text-muted)]"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                {usersDropdownOpen && (
                  <div className="absolute z-50 top-full left-0 mt-1 w-48 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] shadow-lg py-1 max-h-48 overflow-y-auto">
                    {users.length === 0 ? (
                      <div className="px-3 py-1.5 text-[11px] text-[var(--text-muted)]">No users found</div>
                    ) : (
                      users.map(u => (
                        <div
                          key={u._id}
                          onClick={() => toggleUser(u._id)}
                          className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-[var(--bg-surface)] transition-colors ${newProjectUsers.includes(u._id) ? "bg-blue-50" : ""}`}
                        >
                          <div className={`w-3 h-3 rounded border flex items-center justify-center flex-shrink-0 ${newProjectUsers.includes(u._id) ? "bg-blue-500 border-blue-500 text-white" : "border-gray-300"}`}>
                            {newProjectUsers.includes(u._id) && <svg width="8" height="6" viewBox="0 0 8 6" fill="currentColor"><path d="M1 3L3 5L7 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                          </div>
                          <div className="w-5 h-5 rounded-full bg-gray-700 text-white flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                            {u.firstName?.charAt(0)}
                          </div>
                          <span className="text-[11px] truncate">{u.firstName} {u.lastName}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Date + Actions */}
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[12px] text-[var(--text-secondary)] flex-1">Today</span>
                <button
                  onClick={handleCreateProject}
                  disabled={createProjectMutation.isPending}
                  className="text-green-600 hover:text-green-700 transition-colors"
                  title="Save Project"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                </button>
                <button
                  onClick={() => setIsAdding(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Cancel"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>

              {/* Error Message */}
              {projectError && (
                <div className="col-span-4 text-[11px] text-red-600 font-medium bg-red-50 p-2 rounded border border-red-200">
                  {projectError}
                </div>
              )}
            </div>
          ) : (
            (projects.length > 0 || isAdding) && (
              <button
                onClick={() => { setIsAdding(true); setNewProjectName(""); setNewProjectDesc(""); setNewProjectTeamId(""); setNewProjectUsers([]); setProjectError(""); }}
                className="w-full flex items-center gap-2 px-8 py-3 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all border-t border-transparent hover:border-[var(--border-subtle)] rounded-b-lg"
              >
                <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" data-view-component="true" className="octicon octicon-repo" fill="currentColor">
                  <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z"></path>
                </svg>
                Add Project
              </button>
            )
          )
        )}
      </div>
    </div>
  );
}
