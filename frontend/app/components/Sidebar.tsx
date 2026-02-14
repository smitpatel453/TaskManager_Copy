"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { authApi } from "../../src/api/auth.api";
import { projectsApi } from "../../src/api/projects.api";
import {
  HomeIcon,
  FolderIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  PlusIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
  DocumentPlusIcon,
} from "@heroicons/react/24/outline";

interface SidebarProps {
  userRole?: "admin" | "user";
}

type User = {
  firstName: string;
  lastName: string;
  email: string;
  role?: "admin" | "user";
};

// Tree connector for sidebar tree-view lines (file-tree style: ├── └──)
function TreeConnector({ isLast }: { isLast: boolean }) {
  const lineClass = "bg-gray-400/60 dark:bg-gray-500/60";
  return (
    <div className="w-5 flex-shrink-0 relative" style={{ minHeight: 28 }}>
      {/* Vertical line │ — full height for ├, half for └ */}
      <div
        className={`absolute left-[3px] top-0 w-px ${lineClass}`}
        style={{ height: isLast ? '50%' : '100%' }}
      />
      {/* Horizontal branch ── */}
      <div
        className={`absolute left-[3px] h-px ${lineClass}`}
        style={{ width: 14, top: '50%' }}
      />
    </div>
  );
}

export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string>("");
  const [passwordSuccess, setPasswordSuccess] = useState<string>("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isReloading, setIsReloading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Collapsible sections
  const [myTasksOpen, setMyTasksOpen] = useState(false);
  const [myProjectsOpen, setMyProjectsOpen] = useState(false);

  // Sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Fetch projects for sidebar
  const isAdmin = userRole === "admin";
  const { data: projectsData, refetch: refetchProjects } = useQuery({
    queryKey: ["projects", isAdmin ? "admin" : "user"],
    queryFn: isAdmin ? projectsApi.getAllProjects : projectsApi.getMyProjects,
    enabled: !!userRole,
    staleTime: 5 * 60 * 1000,
  });

  const projects = projectsData?.data || [];

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }

    if (typeof window !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const getApiErrorMessage = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
      const data = err.response?.data as { error?: string; message?: string } | undefined;
      return data?.error || data?.message || err.message || fallback;
    }
    if (err instanceof Error) return err.message;
    return fallback;
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const openPasswordModal = () => {
    setPasswordError("");
    setPasswordSuccess("");
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setIsPasswordModalOpen(true);
    setIsDropdownOpen(false);
  };

  const handleReloadProjects = async () => {
    setIsReloading(true);
    try {
      await refetchProjects();
    } catch (error) {
      console.error("Failed to reload projects:", error);
    } finally {
      setIsReloading(false);
    }
  };

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false);
    setPasswordError("");
    setPasswordSuccess("");
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const handlePasswordFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!passwordForm.currentPassword) {
      setPasswordError("Current password is required");
      return;
    }
    if (!passwordForm.newPassword) {
      setPasswordError("New password is required");
      return;
    }
    if (!passwordForm.confirmPassword) {
      setPasswordError("Confirm password is required");
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError("New password and confirm password do not match");
      return;
    }

    try {
      setIsPasswordLoading(true);
      const result = await authApi.changePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
        passwordForm.confirmPassword
      );
      setPasswordSuccess(result.message);
      setTimeout(() => {
        closePasswordModal();
      }, 2000);
    } catch (error) {
      console.error("Password change error:", error);
      setPasswordError(getApiErrorMessage(error, "Failed to change password"));
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };


  return (
    <>
      {/* Single workspace sidebar */}
      <div
        className={`${isCollapsed ? "w-[60px]" : "w-[260px]"} bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] flex flex-col flex-shrink-0 z-10 hidden md:flex transition-all duration-300 ease-in-out`}
      >
        {/* Workspace Header */}
        <div
          className={`h-14 border-b border-[var(--border-subtle)] flex items-center ${isCollapsed ? "justify-center px-0" : "justify-between px-3"} cursor-pointer hover:bg-[var(--bg-surface-2)] transition-colors relative group`}
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Click to expand" : "Click to collapse"}
        >
          {!isCollapsed ? (
            <div className="flex items-center gap-2 truncate flex-1 min-w-0">
              <div className="w-6 h-6 bg-gradient-to-tr from-green-400 to-blue-500 rounded text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                {user?.firstName?.charAt(0) || "T"}
              </div>
              <span className="font-semibold text-[13px] truncate text-[var(--text-primary)]">
                {user ? `${user.firstName}'s Workspace` : "Task Manager"}
              </span>
              <ChevronDownIcon className="w-3 h-3 text-[var(--text-tertiary)] flex-shrink-0" />
            </div>
          ) : (
            <div className="w-full flex justify-center items-center h-full">
              <div className="w-8 h-8 bg-gradient-to-tr from-green-400 to-blue-500 rounded text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0 shadow-sm group-hover:shadow-md transition-shadow">
                {user?.firstName?.charAt(0) || "T"}
              </div>
            </div>
          )}

          {/* Collapse Icon (Visible on Hover when Expanded) */}
          {!isCollapsed && (
            <button
              onClick={(e) => { e.stopPropagation(); setIsCollapsed(true); }}
              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-3)] rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="relative flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto py-3 ck-scrollbar">
            {/* Quick links */}
            <div className={`px-2 space-y-0.5 ${isCollapsed ? "flex flex-col items-center" : ""}`}>
              <SidebarItem
                href="/dashboard"
                icon={
                  <div className="flex items-center gap-1.5">
                    <div className={!isCollapsed ? "w-3.5 h-3.5" : ""} />
                    <HomeIcon className="w-4 h-4" />
                  </div>
                }
                label="Overview"
                active={pathname === "/dashboard"}
                collapsed={isCollapsed}
              />
            </div>

            {/* Admin: Users */}
            {userRole === "admin" && (
              <div className={`mt-5 px-2 ${isCollapsed ? "flex flex-col items-center" : ""}`}>
                <SidebarItem
                  href="/dashboard/users"
                  icon={
                    <div className="flex items-center gap-1.5">
                      <div className={!isCollapsed ? "w-3.5 h-3.5" : ""} />
                      <UsersIcon className="w-4 h-4" />
                    </div>
                  }
                  label="Users"
                  active={pathname === "/dashboard/users"}
                  collapsed={isCollapsed}
                />
              </div>
            )}

            {/* Admin: All Tasks - Direct link */}
            {userRole === "admin" && (
              <div className={`mt-5 px-2 ${isCollapsed ? "flex flex-col items-center" : ""}`}>
                <SidebarItem
                  href="/dashboard/tasks"
                  icon={
                    <div className="flex items-center gap-1.5">
                      <div className={!isCollapsed ? "w-3.5 h-3.5" : ""} />
                      <ClipboardDocumentListIcon className="w-4 h-4" />
                    </div>
                  }
                  label="All Tasks"
                  active={pathname === "/dashboard/tasks"}
                  collapsed={isCollapsed}
                />
              </div>
            )}

            {/* Regular Users: My Tasks Section */}
            {userRole !== "admin" && (
              <div className={`mt-4 px-2 ${isCollapsed ? "flex flex-col items-center" : ""}`}>
                {!isCollapsed ? (
                  <button
                    onClick={() => setMyTasksOpen(!myTasksOpen)}
                    className="flex items-center gap-1.5 text-[var(--text-tertiary)] px-2 py-1 mb-1 w-full hover:text-[var(--text-secondary)] transition-colors"
                  >
                    <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${!myTasksOpen ? "-rotate-90" : ""}`} />
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                    <span className="font-medium text-[11px]">My Tasks</span>
                  </button>
                ) : (
                  <div className="mb-2 text-[var(--text-tertiary)]" title="My Tasks">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}

                {(!isCollapsed && myTasksOpen) && (
                  <div className="ml-3.5 py-0.5">
                    {[
                      {
                        key: "assigned", el: (
                          <SidebarItem
                            href="/dashboard/tasks?filter=assigned"
                            label="Assigned to me"
                            active={pathname === "/dashboard/tasks" && searchParams.get("filter") === "assigned"}
                            icon={
                              <div className="w-4 h-4 rounded-full bg-gray-700 text-white flex items-center justify-center text-[9px] font-bold">
                                {user?.firstName?.charAt(0) || "T"}
                              </div>
                            }
                          />
                        )
                      },
                      {
                        key: "all", el: (
                          <SidebarItem
                            href="/dashboard/tasks"
                            label="All Tasks"
                            active={pathname === "/dashboard/tasks" && !searchParams.get("filter")}
                            icon={<ClipboardDocumentListIcon className="w-4 h-4" />}
                          />
                        )
                      },
                      {
                        key: "created", el: (
                          <SidebarItem
                            href="/dashboard/tasks?filter=created"
                            label="Personal List"
                            active={pathname === "/dashboard/tasks" && searchParams.get("filter") === "created"}
                            icon={
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                              </svg>
                            }
                          />
                        )
                      },
                    ].map((item, idx, arr) => (
                      <div key={item.key} className="flex items-stretch">
                        <TreeConnector isLast={idx === arr.length - 1} />
                        <div className="flex-1 min-w-0">{item.el}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* My Projects - Admin Only */}
            {userRole === "admin" && (
              <div className={`mt-5 px-2 ${isCollapsed ? "flex flex-col items-center" : ""}`}>
                {!isCollapsed ? (
                  <div className="flex items-center justify-between text-[var(--text-tertiary)] px-2 py-1 mb-1 group">
                    <button
                      onClick={() => setMyProjectsOpen(!myProjectsOpen)}
                      className="flex items-center gap-1 hover:text-[var(--text-secondary)] transition-colors"
                    >
                      <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform duration-200 ${!myProjectsOpen ? "-rotate-90" : ""}`} />
                      <GitHubFolderIcon open={myProjectsOpen} />
                      <span className="font-medium text-[11px]"> My Projects</span>
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleReloadProjects}
                        disabled={isReloading}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[var(--text-primary)] text-[11px] font-medium transition-colors disabled:opacity-50"
                        title="Reload projects"
                      >
                        <svg
                          className={`w-4 h-4 ${isReloading ? 'animate-spin' : ''}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M23 4v6h-6" />
                          <path d="M1 20v-6h6" />
                          <path d="M3.51 9a9 9 0 0114.85-3.36M20.49 15a9 9 0 01-14.85 3.36" />
                        </svg>
                      </button>
                      <Link
                        href="/dashboard/projects"
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] text-[var(--text-primary)] text-[11px] font-medium transition-colors border border-[var(--border-subtle)]"
                      >
                        <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" className="octicon octicon-repo text-[var(--text-primary)] dark:text-white" fill="currentColor">
                          <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
                        </svg>
                        New
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="mb-2 text-[var(--text-tertiary)]" title="My Projects">
                    <GitHubFolderIcon open={false} />
                  </div>
                )}

                {(!isCollapsed && myProjectsOpen) && (
                  <div className="ml-3.5 py-0.5">
                    {projects.length === 0 ? (
                      <div className="flex items-stretch">
                        <TreeConnector isLast />
                        <div className="px-2 py-2 text-[11px] text-[var(--text-muted)]">No projects assigned</div>
                      </div>
                    ) : (
                      projects.map((project, idx) => (
                        <div key={project._id} className="flex items-stretch">
                          <TreeConnector isLast={idx === projects.length - 1} />
                          <div className="flex-1 min-w-0">
                            <ProjectSidebarItem project={project} pathname={pathname} searchParams={searchParams} />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* Collapsed New Project Action */}
                {isCollapsed && (
                  <Link
                    href="/dashboard/projects"
                    className="mt-2 flex items-center justify-center p-2 rounded bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] text-[var(--text-primary)] transition-colors border border-[var(--border-subtle)]"
                    title="New Project"
                  >
                    <svg aria-hidden="true" height="16" viewBox="0 0 16 16" width="16" className="octicon octicon-repo text-[var(--text-primary)] dark:text-white" fill="currentColor">
                      <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z" />
                    </svg>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Bottom section: theme toggle, logout, profile */}
          {user && (
            <div className="border-t border-[var(--border-subtle)]">
              {/* Theme toggle + Logout */}
              <div className={`flex items-center ${isCollapsed ? "flex-col gap-3 py-4" : "justify-between px-4 py-2"}`}>
                <button
                  onClick={toggleTheme}
                  className="p-1.5 rounded-md hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                  title={isDarkMode ? "Light mode" : "Dark mode"}
                >
                  {isDarkMode ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-md hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
                  title="Logout"
                >
                  <ArrowRightOnRectangleIcon className="w-4 h-4" />
                </button>
              </div>

              {/* Profile */}
              {!isCollapsed && (
                <div className="p-3 pt-0">
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={toggleDropdown}
                      className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-[var(--bg-surface-2)] transition-all"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-800 text-white text-[10px] font-bold flex-shrink-0">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </div>
                      <div className="flex-1 text-left overflow-hidden">
                        <p className="text-[12px] font-medium text-[var(--text-primary)] truncate">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-[11px] text-[var(--text-tertiary)] truncate">{user.email}</p>
                      </div>
                      <ChevronDownIcon
                        className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform flex-shrink-0 ${isDropdownOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {/* Dropdown Menu */}
                    {isDropdownOpen && (
                      <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg bg-[var(--bg-canvas)] shadow-lg border border-[var(--border-subtle)] py-1 z-50">
                        <button
                          onClick={openPasswordModal}
                          className="w-full text-left px-4 py-2 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] transition-colors flex items-center gap-2"
                        >
                          <Cog6ToothIcon className="w-4 h-4" />
                          Change Password
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Change Password</h2>

            {passwordError && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                <p className="text-sm text-[var(--status-error)]">{passwordError}</p>
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                <p className="text-sm text-[var(--status-success)]">{passwordSuccess}</p>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <input
                type="password"
                name="currentPassword"
                placeholder="Current Password"
                value={passwordForm.currentPassword}
                onChange={handlePasswordFormChange}
                required
                disabled={isPasswordLoading}
                className="ck-input w-full"
              />
              <input
                type="password"
                name="newPassword"
                placeholder="New Password (min 6 characters)"
                value={passwordForm.newPassword}
                onChange={handlePasswordFormChange}
                required
                disabled={isPasswordLoading}
                className="ck-input w-full"
              />
              <input
                type="password"
                name="confirmPassword"
                placeholder="Confirm New Password"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordFormChange}
                required
                disabled={isPasswordLoading}
                className="ck-input w-full"
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closePasswordModal}
                  className="ck-btn-secondary"
                  disabled={isPasswordLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPasswordLoading}
                  className="ck-btn-primary"
                >
                  {isPasswordLoading ? "Changing..." : "Change Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// Sub-component for Sidebar Items
function SidebarItem({
  icon,
  label,
  rightText,
  rightIcon,
  active,
  href,
  collapsed
}: {
  icon?: React.ReactNode;
  label: string;
  rightText?: string;
  rightIcon?: React.ReactNode;
  active?: boolean;
  href?: string;
  collapsed?: boolean;
}) {
  const content = (
    <div
      className={`flex items-center ${collapsed ? "justify-center px-0 py-2" : "justify-between px-2 py-1.5"} rounded transition-colors ${active
        ? "bg-[var(--bg-surface-3)] text-[var(--text-primary)] font-medium shadow-sm"
        : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)]"
        }`}
      title={collapsed ? label : undefined}
    >
      <div className={`flex items-center gap-2 overflow-hidden ${collapsed ? "" : "flex-1"}`}>
        {icon && (
          <div className={`${active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"} flex-shrink-0`}>{icon}</div>
        )}
        {!collapsed && <span className="truncate text-[12px] font-medium">{label}</span>}
      </div>
      {(!collapsed && (rightText || rightIcon)) && (
        <div className={`text-[11px] ${active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"} flex items-center`}>
          {rightText && <span>{rightText}</span>}
          {rightIcon && (
            <span className="opacity-0 hover:opacity-100 transition-opacity">{rightIcon}</span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block w-full">{content}</Link>;
  }

  return content;
}

// GitHub-style folder icon
const GitHubFolderIcon = ({ open }: { open?: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="flex-shrink-0" style={{ overflow: 'visible' }}>
    {open ? (
      <path d="M.513 1.513A1.75 1.75 0 0 1 1.75 1h3.5c.63 0 1.238.223 1.715.625L7.94 2.44A.25.25 0 0 0 8.104 2.5H13.25A1.75 1.75 0 0 1 15 4.25v.757c.244.153.45.38.573.669l.75 2.25A1.75 1.75 0 0 1 14.663 10H1.337a1.75 1.75 0 0 1-1.66-2.074l.75-2.25A1.75 1.75 0 0 1 1 5.007V2.75c0-.464.184-.91.513-1.237ZM1.75 2.5a.25.25 0 0 0-.25.25v2.257l.61-.183A1.75 1.75 0 0 1 2.64 4.75h10.72a1.75 1.75 0 0 1 .53.082l.61.183V4.25a.25.25 0 0 0-.25-.25H8.104a1.75 1.75 0 0 1-1.164-.44L5.965 2.69a.762.762 0 0 0-.49-.19h-3.5ZM14.663 8.5H1.337a.25.25 0 0 1-.237-.296l.75-2.25a.25.25 0 0 1 .237-.204h11.826a.25.25 0 0 1 .237.204l.75 2.25a.25.25 0 0 1-.237.296Z" />
    ) : (
      <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75ZM1.5 2.75a.25.25 0 0 1 .25-.25H5c.1 0 .2.05.264.113l.943 1.257c.335.447.843.704 1.383.75l-.001.065v.065H1.5v-2Zm0 3.5h13v7a.25.25 0 0 1-.25.25H1.75a.25.25 0 0 1-.25-.25v-7Z" />
    )}
  </svg>
);

// Project sidebar item with expandable user dropdown
function ProjectSidebarItem({ project, pathname, searchParams }: { project: { _id: string; projectName: string; assignedUsers?: Array<{ _id: string; firstName: string; lastName: string }> }; pathname: string; searchParams: URLSearchParams }) {
  const [expanded, setExpanded] = useState(false);
  const assignedUsers = project.assignedUsers || [];
  const isActive = pathname === "/dashboard/tasks" && searchParams.get("project") === project._id;

  return (
    <div className="select-none">
      <div className={`flex items-center justify-between px-2 py-1.5 rounded hover:bg-[var(--bg-surface-2)] group cursor-pointer transition-colors ${
        isActive ? "bg-[var(--bg-surface-2)] text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
      }`}>
        {/* Expand toggle */}
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(!expanded); }}
          className="p-0 mr-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex-shrink-0"
        >
          <ChevronRightIcon className={`w-3 h-3 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
        </button>

        {/* Folder icon + name (navigates) */}
        <Link href={`/dashboard/tasks?project=${project._id}`} className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`flex-shrink-0 ${
            isActive ? "text-[var(--ck-blue)]" : "text-[var(--text-muted)]"
          }`}>
            <GitHubFolderIcon open={expanded} />
          </span>
          <span className={`truncate text-[12px] font-medium ${
            isActive ? "text-[var(--text-primary)]" : ""
          }`}>{project.projectName}</span>
        </Link>

        {/* User count badge */}
        {assignedUsers.length > 0 && (
          <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-surface-2)] px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1">
            {assignedUsers.length}
          </span>
        )}
      </div>

      {expanded && (
        <div className="ml-5 py-0.5">
          {assignedUsers.length === 0 ? (
            <div className="flex items-stretch">
              <TreeConnector isLast />
              <div className="px-2 py-1 text-[11px] text-[var(--text-muted)] italic">No users assigned</div>
            </div>
          ) : (
            assignedUsers.map((u, idx) => (
              <div key={u._id} className="flex items-stretch">
                <TreeConnector isLast={idx === assignedUsers.length - 1} />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/dashboard/tasks?project=${project._id}&assignedTo=${u._id}`}
                    className={`flex items-center gap-2 px-2 py-1 rounded hover:bg-[var(--bg-surface-2)] transition-colors cursor-pointer group/user ${
                      pathname === "/dashboard/tasks" && searchParams.get("project") === project._id && searchParams.get("assignedTo") === u._id
                        ? "bg-[var(--bg-surface-2)]"
                        : ""
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0 group-hover/user:bg-blue-600 transition-colors ${
                      pathname === "/dashboard/tasks" && searchParams.get("project") === project._id && searchParams.get("assignedTo") === u._id
                        ? "bg-blue-600"
                        : "bg-gray-700"
                    }`}>
                      {u.firstName?.charAt(0)}{u.lastName?.charAt(0)}
                    </div>
                    <span className={`text-[11px] truncate group-hover/user:text-[var(--text-primary)] transition-colors ${
                      pathname === "/dashboard/tasks" && searchParams.get("project") === project._id && searchParams.get("assignedTo") === u._id
                        ? "text-[var(--text-primary)] font-medium"
                        : "text-[var(--text-secondary)]"
                    }`}>
                      {u.firstName} {u.lastName}
                    </span>
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
