"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, memo, Suspense, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { authApi } from "../../src/api/auth.api";
import { channelsApi } from "../../src/api/channels.api";
import { projectsApi } from "../../src/api/projects.api";
import {
  HomeIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  SunIcon,
  MoonIcon,
  PlusIcon,
  ChartBarIcon,
  SquaresPlusIcon,
  EllipsisHorizontalIcon,
  XMarkIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { SkeletonSidebarItems } from "./Skeleton";

/* ─── Channel member type ───────────────────────────────────── */
type ChannelMember = { _id: string; firstName: string; lastName: string; email?: string };
type StoredChannel = {
  id: string;
  name: string;
  members?: ChannelMember[];
  isPrivate?: boolean;
  createdBy?: string;
  joinedMemberIds?: string[];
};

interface SidebarProps {
  userRole?: "admin" | "user";
}

type User = {
  _id?: string;
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: "admin" | "user";
};

// ─── Icon Rail Nav items ──────────────────────────────────────
const navItems = [
  {
    id: "home",
    label: "Home",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <polyline points="9 21 9 12 15 12 15 21" />
      </svg>
    ),
    href: "/dashboard",
  },
  {
    id: "tasks",
    label: "My Tasks",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    href: "/dashboard/tasks",
  },
  {
    id: "teams",
    label: "Teams",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: <ChartBarIcon width={20} height={20} strokeWidth={1.8} />,
    href: "/dashboard",
    adminOnly: true,
  },
  {
    id: "projects",
    label: "Projects",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
    href: "/dashboard/projects",
    adminOnly: true,
  },
  {
    id: "users",
    label: "Users",
    icon: <UsersIcon width={20} height={20} strokeWidth={1.8} />,
    href: "/dashboard/users",
    adminOnly: true,
  },
];

// ─── Task filters component ───────────────────────────────────
const TaskFilters = memo(function TaskFilters({
  pathname,
  myTasksOpen,
  user,
  onNavigate,
}: {
  pathname: string;
  myTasksOpen: boolean;
  user: User | null;
  onNavigate: (url: string) => void;
}) {
  const searchParams = useSearchParams();
  if (!myTasksOpen) return null;
  return (
    <div className="ml-3.5 py-0.5">
      {[
        {
          key: "assigned",
          href: "/dashboard/tasks?filter=assigned",
          label: "Assigned to me",
          isActive: pathname === "/dashboard/tasks" && searchParams.get("filter") === "assigned",
          icon: (
            <div className="w-4 h-4 rounded-full bg-[var(--bg-surface-3)] text-[var(--text-primary)] flex items-center justify-center text-[9px] font-bold">
              {user?.firstName?.charAt(0) || "T"}
            </div>
          ),
        },
        {
          key: "all",
          href: "/dashboard/tasks",
          label: "All Tasks",
          isActive: pathname === "/dashboard/tasks" && !searchParams.get("filter"),
          icon: <ClipboardDocumentListIcon className="w-4 h-4" />,
        },
        {
          key: "created",
          href: "/dashboard/tasks?filter=created",
          label: "Personal List",
          isActive: pathname === "/dashboard/tasks" && searchParams.get("filter") === "created",
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          ),
        },
      ].map((item, idx, arr) => (
        <div key={item.key} className="flex items-stretch">
          <TreeConnector isLast={idx === arr.length - 1} />
          <div className="flex-1 min-w-0">
            <ContentPanelItem
              href={item.href}
              label={item.label}
              active={item.isActive}
              icon={item.icon}
              onNavigate={onNavigate}
            />
          </div>
        </div>
      ))}
    </div>
  );
});

// ─── Projects List ────────────────────────────────────────────
const ProjectsList = memo(function ProjectsList({
  projects,
  pathname,
  onNavigate,
  loading,
}: {
  projects: Array<{ _id: string; projectName: string; assignedUsers?: Array<{ _id: string; firstName: string; lastName: string }> }>;
  pathname: string;
  onNavigate: (url: string) => void;
  loading?: boolean;
}) {
  const searchParams = useSearchParams();
  if (loading) return <SkeletonSidebarItems count={3} />;
  if (projects.length === 0) {
    return (
      <div className="flex items-stretch">
        <TreeConnector isLast />
        <div className="px-2 py-2 text-[11px] text-[var(--text-muted)]">No projects assigned</div>
      </div>
    );
  }
  return (
    <>
      {projects.map((project, idx) => (
        <div key={project._id} className="flex items-stretch">
          <TreeConnector isLast={idx === projects.length - 1} />
          <div className="flex-1 min-w-0">
            <ProjectSidebarItem project={project} pathname={pathname} searchParams={searchParams} onNavigate={onNavigate} />
          </div>
        </div>
      ))}
    </>
  );
});

// ─── Tree connector ───────────────────────────────────────────
function TreeConnector({ isLast }: { isLast: boolean }) {
  const lineClass = "bg-[var(--border-default)] opacity-50";
  return (
    <div className="w-5 flex-shrink-0 relative" style={{ minHeight: 28 }}>
      <div className={`absolute left-[3px] top-0 w-px ${lineClass}`} style={{ height: isLast ? "50%" : "100%" }} />
      <div className={`absolute left-[3px] h-px ${lineClass}`} style={{ width: 14, top: "50%" }} />
    </div>
  );
}

// ─── Content Panel Item ───────────────────────────────────────
function ContentPanelItem({
  icon,
  label,
  rightText,
  active,
  href,
  onNavigate,
}: {
  icon?: React.ReactNode;
  label: string;
  rightText?: string;
  active?: boolean;
  href?: string;
  onNavigate?: (url: string) => void;
}) {
  const handleClick = () => { if (href && onNavigate) onNavigate(href); };
  return (
    <div
      className={`flex items-center justify-between px-2 py-1.5 rounded-md transition-all duration-150 group ${active
        ? "bg-[var(--accent-light)] text-[var(--accent)]"
        : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]"
        } ${href ? "cursor-pointer" : ""}`}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        {icon && (
          <div className={`flex-shrink-0 ${active ? "text-[var(--accent)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"}`}>
            {icon}
          </div>
        )}
        <span className="truncate text-[12px] font-medium">{label}</span>
      </div>
      {rightText && (
        <span className={`text-[11px] flex-shrink-0 ml-1 ${active ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>
          {rightText}
        </span>
      )}
    </div>
  );
}

// ─── GitHub folder icon ───────────────────────────────────────
const GitHubFolderIcon = ({ open }: { open?: boolean }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" className="flex-shrink-0">
    {open ? (
      <path d="M.513 1.513A1.75 1.75 0 0 1 1.75 1h3.5c.63 0 1.238.223 1.715.625L7.94 2.44A.25.25 0 0 0 8.104 2.5H13.25A1.75 1.75 0 0 1 15 4.25v.757c.244.153.45.38.573.669l.75 2.25A1.75 1.75 0 0 1 14.663 10H1.337a1.75 1.75 0 0 1-1.66-2.074l.75-2.25A1.75 1.75 0 0 1 1 5.007V2.75c0-.464.184-.91.513-1.237ZM1.75 2.5a.25.25 0 0 0-.25.25v2.257l.61-.183A1.75 1.75 0 0 1 2.64 4.75h10.72a1.75 1.75 0 0 1 .53.082l.61.183V4.25a.25.25 0 0 0-.25-.25H8.104a1.75 1.75 0 0 1-1.164-.44L5.965 2.69a.762.762 0 0 0-.49-.19h-3.5ZM14.663 8.5H1.337a.25.25 0 0 0-.237-.296l.75-2.25a.25.25 0 0 1 .237-.204h11.826a.25.25 0 0 1 .237.204l.75 2.25a.25.25 0 0 1-.237.296Z" />
    ) : (
      <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75ZM1.5 2.75a.25.25 0 0 1 .25-.25H5c.1 0 .2.05.264.113l.943 1.257c.335.447.843.704 1.383.75l-.001.065v.065H1.5v-2Zm0 3.5h13v7a.25.25 0 0 1-.25.25H1.75a.25.25 0 0 1-.25-.25v-7Z" />
    )}
  </svg>
);

// ─── Project sidebar item ─────────────────────────────────────
function ProjectSidebarItem({
  project, pathname, searchParams, onNavigate,
}: {
  project: { _id: string; projectName: string; assignedUsers?: Array<{ _id: string; firstName: string; lastName: string }> };
  pathname: string;
  searchParams: URLSearchParams;
  onNavigate: (url: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const assignedUsers = project.assignedUsers || [];
  const isActive = pathname === "/dashboard/tasks" && searchParams.get("project") === project._id;

  return (
    <div className="select-none">
      <div className={`flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-[var(--bg-surface-2)] group cursor-pointer transition-all ${isActive ? "bg-[var(--accent-light)] text-[var(--accent)]" : "text-[var(--text-secondary)]"
        }`}>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(!expanded); }}
          className="p-0 mr-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex-shrink-0"
        >
          <ChevronRightIcon className={`w-3 h-3 transition-transform duration-200 ${expanded ? "rotate-90" : ""}`} />
        </button>
        <div onClick={() => onNavigate(`/dashboard/tasks?project=${project._id}`)} className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
          <span className={`flex-shrink-0 ${isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`}>
            <GitHubFolderIcon open={expanded} />
          </span>
          <span className={`truncate text-[12px] font-medium ${isActive ? "text-[var(--accent)]" : ""}`}>
            {project.projectName}
          </span>
        </div>
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
            assignedUsers.map((u, idx) => {
              const isUserActive = pathname === "/dashboard/tasks" && searchParams.get("project") === project._id && searchParams.get("assignedTo") === u._id;
              return (
                <div key={u._id} className="flex items-stretch">
                  <TreeConnector isLast={idx === assignedUsers.length - 1} />
                  <div
                    className={`flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all hover:bg-[var(--bg-surface-2)] ${isUserActive ? "bg-[var(--accent-light)] text-[var(--accent)]" : "text-[var(--text-secondary)]"}`}
                    onClick={() => onNavigate(`/dashboard/tasks?project=${project._id}&assignedTo=${u._id}`)}
                  >
                    <div className="w-4 h-4 rounded-full bg-gray-600 text-white flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                      {u.firstName?.charAt(0)}
                    </div>
                    <span className="truncate text-[11px]">{u.firstName} {u.lastName}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────
export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordError, setPasswordError] = useState<string>("");
  const [passwordSuccess, setPasswordSuccess] = useState<string>("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Active icon rail panel
  const [activePanel, setActivePanel] = useState<string>("home");

  // Collapsible sections inside content panel
  const [myTasksOpen, setMyTasksOpen] = useState(false);
  const [myProjectsOpen, setMyProjectsOpen] = useState(true);

  // Channels state
  const [channels, setChannels] = useState<StoredChannel[]>([]);
  const [channelsOpen, setChannelsOpen] = useState(true);

  // Create-channel modal
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelPrivacy, setNewChannelPrivacy] = useState<"public" | "private">("public");
  const [allUsers, setAllUsers] = useState<ChannelMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<ChannelMember[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);

  const [isMounted, setIsMounted] = useState(false);
  const currentUserId =
    (user as (User & { _id?: string; id?: string; userId?: string }) | null)?._id ||
    (user as (User & { _id?: string; id?: string; userId?: string }) | null)?.id ||
    (user as (User & { _id?: string; id?: string; userId?: string }) | null)?.userId ||
    "";

  // Fetch projects
  const isAdmin = userRole === "admin";
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", isAdmin ? "admin" : "user"],
    queryFn: isAdmin ? projectsApi.getAllProjects : projectsApi.getMyProjects,
    enabled: !!userRole,
    staleTime: 5 * 60 * 1000,
  });
  const projects = projectsData?.data || [];

  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch { }
    }
    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("theme-mode");
      const isDark = storedTheme ? storedTheme === "dark" : document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
      if (isDark) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    const loadChannels = async () => {
      try {
        const data = await channelsApi.getChannels();
        setChannels(data as unknown as StoredChannel[]);
      } catch (error) {
        console.error("Failed to load channels", error);
        setChannels([]);
      }
    };

    loadChannels();
  }, []);

  const openChannelModal = async () => {
    setIsChannelModalOpen(true);
    setNewChannelName("");
    setNewChannelPrivacy("public");
    setSelectedMembers([]);
    setMemberSearch("");
    // Fetch users
    setUsersLoading(true);
    try {
      const users = await channelsApi.getUsers();
      setAllUsers(users);
    } catch (_) {
      setAllUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      setIsChannelModalOpen(false);
      return;
    }

    const creator: ChannelMember | null = user
      ? {
        _id: currentUserId || "me",
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      }
      : null;

    const baseMembers = newChannelPrivacy === "private" ? selectedMembers : [];
    const allChannelMembers = creator
      ? [creator, ...baseMembers.filter((m) => m._id !== creator._id)]
      : baseMembers;

    try {
      const created = await channelsApi.createChannel({
        name: newChannelName.trim(),
        isPrivate: newChannelPrivacy === "private",
        members: (newChannelPrivacy === "private" ? allChannelMembers : []).map((m) => m._id),
      });

      setChannels((prev) => [...prev, created as unknown as StoredChannel]);
      setNewChannelName("");
      setNewChannelPrivacy("public");
      setSelectedMembers([]);
      setIsChannelModalOpen(false);
      navigateTo(`/dashboard/channels/${created.id}`);
    } catch (error) {
      console.error("Failed to create channel", error);
    }
  };

  const joinChannel = async (channelId: string) => {
    if (!currentUserId) return;

    try {
      const joinedChannel = await channelsApi.joinChannel(channelId);
      setChannels((prev) => prev.map((chan) => (chan.id === channelId ? (joinedChannel as unknown as StoredChannel) : chan)));
    } catch (error) {
      console.error("Failed to join channel", error);
    }
  };

  const visibleChannels = useMemo(() => {
    return channels;
  }, [channels]);

  const toggleMember = (u: ChannelMember) => {
    setSelectedMembers((prev) =>
      prev.find((m) => m._id === u._id) ? prev.filter((m) => m._id !== u._id) : [...prev, u]
    );
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
    };
    if (isDropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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

  const openPasswordModal = () => {
    setPasswordError(""); setPasswordSuccess("");
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setIsPasswordModalOpen(true); setIsDropdownOpen(false);
  };

  const closePasswordModal = () => {
    setIsPasswordModalOpen(false); setPasswordError(""); setPasswordSuccess("");
    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const handlePasswordFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordError(""); setPasswordSuccess("");
    if (!passwordForm.currentPassword) { setPasswordError("Current password is required"); return; }
    if (!passwordForm.newPassword) { setPasswordError("New password is required"); return; }
    if (passwordForm.newPassword.length < 6) { setPasswordError("Min 6 characters"); return; }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { setPasswordError("Passwords don't match"); return; }
    try {
      setIsPasswordLoading(true);
      const result = await authApi.changePassword(passwordForm.currentPassword, passwordForm.newPassword, passwordForm.confirmPassword);
      setPasswordSuccess(result.message);
      setTimeout(closePasswordModal, 2000);
    } catch (error) {
      setPasswordError(getApiErrorMessage(error, "Failed to change password"));
    } finally {
      setIsPasswordLoading(false);
    }
  };

  const navigateTo = (url: string) => { router.push(url); };

  const toggleTheme = () => {
    const newDark = !isDarkMode;
    setIsDarkMode(newDark);
    if (newDark) { document.documentElement.classList.add("dark"); localStorage.setItem("theme-mode", "dark"); }
    else { document.documentElement.classList.remove("dark"); localStorage.setItem("theme-mode", "light"); }
  };

  // ─── Content panel renderers ──────────────────────────────
  const renderHomePanel = () => (
    <div className="flex-1 overflow-y-auto py-3 ck-scrollbar px-2 space-y-0.5">
      {/* Header */}
      <div className="flex items-center justify-between px-2 pb-1 mb-1">
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">Home</span>
        <button className="p-1 rounded hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)]">
          <PlusIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inbox / Quick items */}
      {[
        { label: "Inbox", href: "/dashboard", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" /></svg> },
        { label: "Replies", href: "/dashboard", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 00-4-4H4" /></svg> },
        { label: "Assigned Comments", href: "/dashboard", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg> },
        { label: "My Tasks", href: "/dashboard/tasks", icon: <ClipboardDocumentListIcon className="w-3.5 h-3.5" /> },
      ].map((item) => (
        <ContentPanelItem key={item.label} href={item.href} label={item.label} icon={item.icon} active={pathname === item.href && item.href !== "/dashboard"} onNavigate={navigateTo} />
      ))}

      <div className="my-2 border-t border-[var(--border-subtle)]" />

      {/* Channels section */}
      <div className="flex items-center justify-between px-2 py-1 mt-2">
        <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Channels</span>
        <button
          onClick={openChannelModal}
          className="p-1 rounded hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)]"
          title="New Channel"
        >
          <PlusIcon className="w-3 h-3" />
        </button>
      </div>

      {isMounted && channelsOpen && (
        <div className="space-y-0.5 mt-1">
          {visibleChannels.map((chan) => {
            const channelId = ((chan as { id?: string; channelId?: string }).id || (chan as { id?: string; channelId?: string }).channelId || "").toLowerCase();
            const isActive = pathname === `/dashboard/channels/${channelId}`;
            const isJoined = !!(chan.joined || (!!currentUserId && (chan.joinedMemberIds || []).includes(currentUserId)));
            const showJoin = !isJoined;
            return (
              <div
                key={channelId || chan.name}
                className={`flex items-center justify-between px-2 py-1.5 rounded-md transition-all duration-150 group ${isActive
                  ? "bg-[var(--accent-light)] text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]"
                  }`}
              >
                <button
                  onClick={() => navigateTo(`/dashboard/channels/${channelId}`)}
                  className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 text-left"
                >
                  <div className={`flex-shrink-0 ${isActive ? "text-[var(--accent)]" : "text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]"}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 9h16 M4 15h16 M10 3L8 21 M16 3l-2 18" /></svg>
                  </div>
                  <span className="truncate text-[12px] font-medium">{chan.name}</span>
                  {chan.isPrivate && (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)] flex-shrink-0">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  )}
                </button>

                {showJoin ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      joinChannel(channelId);
                    }}
                    className="ml-2 px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg-surface-3)] text-[var(--text-secondary)] opacity-0 group-hover:opacity-100 hover:bg-[var(--ck-blue)] hover:text-white transition-all"
                    title="Join channel"
                  >
                    Join
                  </button>
                ) : (
                  <div className="ml-2 w-9" />
                )}
              </div>
            );
          })}
          <button
            onClick={openChannelModal}
            className="flex items-center gap-2 px-2 py-1.5 w-full text-left hover:bg-[var(--bg-surface-2)] rounded-md transition-colors group"
          >
            <PlusIcon className="w-3.5 h-3.5 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors" />
            <span className="text-[12px] text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors">Add Channel</span>
          </button>
        </div>
      )}

      <div className="my-3 border-t border-[var(--border-subtle)]" />

      {/* Spaces section (projects) */}
      <div className="flex items-center justify-between px-2 py-1">
        <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">Spaces</span>
        {isAdmin && (
          <button
            onClick={() => navigateTo("/dashboard/projects")}
            className="p-1 rounded hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)]"
            title="New Space"
          >
            <PlusIcon className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* All Tasks */}
      <ContentPanelItem
        href="/dashboard/tasks"
        label="All Tasks"
        rightText={`${projects.length}`}
        active={pathname === "/dashboard/tasks" && (typeof window !== "undefined" ? !new URLSearchParams(window.location.search).get("project") : true)}
        onNavigate={navigateTo}
        icon={<ClipboardDocumentListIcon className="w-3.5 h-3.5" />}
      />

      {/* Projects tree */}
      {isMounted && (
        projectsLoading ? (
          <SkeletonSidebarItems count={4} />
        ) : projects.length > 0 ? (
          <div className="mt-1">
            <button
              onClick={() => setMyProjectsOpen(!myProjectsOpen)}
              className="flex items-center gap-1.5 px-2 py-1.5 w-full text-left hover:bg-[var(--bg-surface-2)] rounded-md transition-colors"
            >
              <ChevronRightIcon className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${myProjectsOpen ? "rotate-90" : ""}`} />
              <svg width="14" height="14" viewBox="0 0 16 16" fill="var(--text-muted)">
                <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1H1.75Z" />
              </svg>
              <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider flex-1">My Projects</span>
              <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-surface-2)] px-1.5 py-0.5 rounded-full">{projects.length}</span>
            </button>

            {myProjectsOpen && (
              <div className="ml-3.5 py-0.5">
                <ProjectsList projects={projects} pathname={pathname} onNavigate={navigateTo} />
              </div>
            )}
          </div>
        ) : null
      )}
    </div>
  );

  const renderTeamsPanel = () => (
    <div className="flex-1 overflow-y-auto py-3 ck-scrollbar px-2">
      <div className="flex items-center justify-between px-2 pb-3">
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">Teams</span>
        <button className="p-1 rounded hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)]"><PlusIcon className="w-3.5 h-3.5" /></button>
      </div>

      <div className="space-y-0.5">
        {[
          { label: "All Teams", icon: <UsersIcon className="w-3.5 h-3.5" />, count: 1 },
          { label: "All People", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 1 1 16 0" /></svg>, count: 1 },
          { label: "Analytics", icon: <ChartBarIcon className="w-3.5 h-3.5" /> },
        ].map((item) => (
          <ContentPanelItem key={item.label} label={item.label} icon={item.icon} rightText={item.count ? String(item.count) : undefined} onNavigate={navigateTo} />
        ))}
      </div>

      <div className="my-3 border-t border-[var(--border-subtle)]" />

      <div className="px-2 py-1">
        <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">My Teams</span>
      </div>

      {/* User's workspace team */}
      {user && (
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-[var(--bg-surface-2)] cursor-pointer transition-colors mt-1">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
            {user.firstName?.charAt(0)}
          </div>
          <span className="text-[12px] font-medium text-[var(--text-primary)] truncate">{user.firstName}&apos;s Workspace</span>
        </div>
      )}
    </div>
  );

  const renderTasksPanel = () => (
    <div className="flex-1 overflow-y-auto py-3 ck-scrollbar px-2">
      <div className="px-2 pb-3">
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">My Tasks</span>
      </div>
      <div className="space-y-0.5">
        <button
          onClick={() => setMyTasksOpen(!myTasksOpen)}
          className="flex items-center gap-1.5 px-2 py-1.5 w-full text-left text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)] rounded-md transition-colors text-[11px] font-medium"
        >
          <ChevronDownIcon className={`w-3.5 h-3.5 transition-transform ${!myTasksOpen ? "-rotate-90" : ""}`} />
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
          My Tasks
        </button>

        {isMounted && myTasksOpen && (
          <Suspense fallback={null}>
            <TaskFilters pathname={pathname} myTasksOpen={myTasksOpen} user={user} onNavigate={navigateTo} />
          </Suspense>
        )}
      </div>
    </div>
  );

  // Compute which nav items to show based on role
  const visibleNavItems = navItems.filter((n) => !n.adminOnly || isAdmin);

  // Auto-set active panel from URL
  useEffect(() => {
    if (pathname.startsWith("/dashboard/users")) setActivePanel("users");
    else if (pathname.startsWith("/dashboard/projects")) setActivePanel("projects");
    else if (pathname.startsWith("/dashboard/tasks")) setActivePanel("tasks");
    else setActivePanel("home");
  }, [pathname]);

  const renderPanel = () => {
    switch (activePanel) {
      case "teams": return renderTeamsPanel();
      case "tasks": return renderTasksPanel();
      default: return renderHomePanel();
    }
  };

  return (
    <>
      {/* ── Dual-column sidebar ── */}
      <div className="hidden md:flex h-screen flex-shrink-0">

        {/* Left icon rail — ClickUp dark strip */}
        <div className="w-[56px] bg-[#1A1C22] flex flex-col items-center py-3 gap-1 flex-shrink-0 border-r border-[#2D2F38]">

          {/* Workspace avatar */}
          <button
            className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-bold mb-3 shadow-lg hover:shadow-purple-500/25 transition-all hover:scale-105"
            title={user ? `${user.firstName}'s Workspace` : "Workspace"}
          >
            {user?.firstName?.charAt(0) || "W"}
          </button>

          {/* Nav icons */}
          <div className="flex flex-col items-center gap-0.5 flex-1 w-full px-1">
            {visibleNavItems.map((item) => {
              const isActive = activePanel === item.id || (item.href && pathname === item.href);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActivePanel(item.id);
                    if (item.href) navigateTo(item.href);
                  }}
                  title={item.label}
                  className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-all duration-150 group relative ${isActive
                    ? "bg-white/10 text-white"
                    : "text-gray-400 hover:text-white hover:bg-white/6"
                    }`}
                >
                  <div className={`transition-transform group-hover:scale-110 ${isActive ? "text-white" : "text-gray-400"}`}>
                    {item.icon}
                  </div>
                  <span className="text-[9px] font-medium mt-0.5 leading-none truncate w-full text-center">
                    {item.label}
                  </span>
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white rounded-r-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom: theme + logout */}
          <div className="flex flex-col items-center gap-2 mt-auto pb-1">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-white/8 text-gray-400 hover:text-white transition-all"
              title={isDarkMode ? "Light mode" : "Dark mode"}
            >
              {isDarkMode ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-red-500/15 text-gray-400 hover:text-red-400 transition-all"
              title="Logout"
            >
              <ArrowRightOnRectangleIcon className="w-4 h-4" />
            </button>
            {/* User avatar */}
            {user && (
              <div
                className="w-7 h-7 rounded-full bg-gray-600 text-white flex items-center justify-center text-[10px] font-bold cursor-pointer hover:ring-2 hover:ring-white/20 transition-all mt-1"
                title={`${user.firstName} ${user.lastName}`}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
              </div>
            )}
          </div>
        </div>

        {/* Right content panel */}
        <div className="w-[220px] bg-[var(--bg-surface)] border-r border-[var(--border-subtle)] flex flex-col flex-shrink-0">

          {/* Workspace header */}
          <div className="h-[52px] border-b border-[var(--border-subtle)] flex items-center justify-between px-3 flex-shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-purple-500 to-indigo-600 flex-shrink-0 flex items-center justify-center text-white text-[9px] font-bold">
                {user?.firstName?.charAt(0) || "W"}
              </div>
              <span className="text-[12px] font-semibold text-[var(--text-primary)] truncate">
                {user ? `${user.firstName}'s Workspace` : "Workspace"}
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                className="p-1 rounded hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)]"
                onClick={() => setActivePanel("home")}
              >
                <EllipsisHorizontalIcon className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 rounded hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)]">
                <PlusIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Panel content */}
          {renderPanel()}

          {/* User profile at bottom */}
          {user && (
            <div className="border-t border-[var(--border-subtle)] p-2 flex-shrink-0">
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-[var(--bg-surface-2)] transition-all"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 text-white text-[9px] font-bold flex-shrink-0">
                    {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                  </div>
                  <div className="flex-1 text-left overflow-hidden">
                    <p className="text-[11px] font-medium text-[var(--text-primary)] truncate">{user.firstName} {user.lastName}</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{user.email}</p>
                  </div>
                  <ChevronDownIcon className={`w-3 h-3 text-[var(--text-muted)] transition-transform flex-shrink-0 ${isDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isDropdownOpen && (
                  <div className="absolute bottom-full left-0 right-0 mb-1 rounded-lg bg-[var(--bg-canvas)] shadow-lg border border-[var(--border-subtle)] py-1 z-50 animate-fade-in">
                    <button
                      onClick={openPasswordModal}
                      className="w-full text-left px-3 py-2 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] transition-colors flex items-center gap-2"
                    >
                      <Cog6ToothIcon className="w-3.5 h-3.5" />
                      Change Password
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-[12px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-2"
                    >
                      <ArrowRightOnRectangleIcon className="w-3.5 h-3.5" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Create Channel Modal ── */}
      {isChannelModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setIsChannelModalOpen(false)}>
          <div
            className="w-full max-w-[480px] rounded-xl bg-white shadow-2xl overflow-hidden animate-fade-in flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Subheader */}
            <div className="relative pt-6 px-7 pb-2">
              <button
                onClick={() => setIsChannelModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
              <h2 className="text-[18px] font-bold text-gray-900 mb-1.5">Create Channel</h2>
              <p className="text-[13px] leading-relaxed text-gray-500 pr-4">
                Chat Channels are where conversations happen. Use a name that is easy to find and understand.
              </p>
            </div>

            <div className="px-7 py-4 space-y-6">
              {/* Channel name */}
              <div>
                <label className="block text-[13px] font-semibold text-gray-700 mb-1.5">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateChannel(); if (e.key === "Escape") setIsChannelModalOpen(false); }}
                  placeholder="e.g. Ideas"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-[13px] text-gray-900 placeholder-gray-400 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-all shadow-sm"
                />
              </div>

              {/* Privacy */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-[14px] font-semibold text-gray-800">Channel Privacy</h3>
                  <p className="text-[13px] text-gray-500">Private channels are visible only to invited members.</p>
                </div>

                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="channelPrivacy"
                      checked={newChannelPrivacy === "public"}
                      onChange={() => setNewChannelPrivacy("public")}
                      className="accent-gray-800"
                    />
                    Public
                  </label>
                  <label className="inline-flex items-center gap-2 text-[13px] text-gray-700 cursor-pointer">
                    <input
                      type="radio"
                      name="channelPrivacy"
                      checked={newChannelPrivacy === "private"}
                      onChange={() => setNewChannelPrivacy("private")}
                      className="accent-gray-800"
                    />
                    Private
                  </label>
                </div>
              </div>

              {newChannelPrivacy === "private" && (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-[14px] font-semibold text-gray-800">Invite Members</h3>
                    <p className="text-[13px] text-gray-500">Only selected users can view and message in this channel.</p>
                  </div>

                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search by name or email"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-[13px] text-gray-900 placeholder-gray-400 outline-none focus:border-gray-500 focus:ring-1 focus:ring-gray-500 transition-all shadow-sm"
                  />

                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                    {usersLoading ? (
                      <div className="px-3 py-2 text-[12px] text-gray-500">Loading users...</div>
                    ) : allUsers
                      .filter((u) => `${u.firstName} ${u.lastName} ${u.email || ""}`.toLowerCase().includes(memberSearch.toLowerCase()))
                      .map((u) => {
                        const checked = selectedMembers.some((m) => m._id === u._id);
                        return (
                          <label key={u._id} className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50">
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-gray-800 truncate">{u.firstName} {u.lastName}</p>
                              {u.email && <p className="text-[11px] text-gray-500 truncate">{u.email}</p>}
                            </div>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleMember(u)}
                              className="accent-gray-800"
                            />
                          </label>
                        );
                      })}
                  </div>

                  {selectedMembers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedMembers.map((m) => (
                        <span key={m._id} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gray-100 text-[11px] text-gray-700">
                          {m.firstName}
                          <button onClick={() => toggleMember(m)} className="text-gray-500 hover:text-gray-700">x</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-7 py-5 mt-2 border-t border-gray-100">
              <button
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-[13px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.523 2.527 2.527 0 0 1 2.521 2.523v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.527 2.527 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522v-2.521zm-1.272 0a2.528 2.528 0 0 1-2.521 2.521 2.527 2.527 0 0 1-2.521-2.521V2.521A2.528 2.528 0 0 1 15.164 0a2.528 2.528 0 0 1 2.521 2.522v6.312zM15.166 18.958a2.528 2.528 0 0 1 2.521 2.522A2.528 2.528 0 0 1 15.166 24a2.527 2.527 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.527 2.527 0 0 1-2.521-2.522 2.528 2.528 0 0 1 2.521-2.521h6.312A2.528 2.528 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.312z" fill="#E5B217" />
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.523 2.527 2.527 0 0 1 2.521 2.523v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z" fill="#e01e5a" />
                  <path d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.527 2.527 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z" fill="#36c5f0" />
                  <path d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522v-2.521zm-1.272 0a2.528 2.528 0 0 1-2.521 2.521 2.527 2.527 0 0 1-2.521-2.521V2.521A2.528 2.528 0 0 1 15.164 0a2.528 2.528 0 0 1 2.521 2.522v6.312z" fill="#2eb67d" />
                </svg>
                Import
              </button>
              <button
                onClick={handleCreateChannel}
                disabled={!newChannelName.trim()}
                className="px-6 py-2.5 rounded-lg text-[13px] font-bold bg-[#1d1c1d] hover:bg-black text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] p-6 shadow-xl animate-fade-in">
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
              <input type="password" name="currentPassword" placeholder="Current Password" value={passwordForm.currentPassword} onChange={handlePasswordFormChange} required disabled={isPasswordLoading} className="ck-input w-full" />
              <input type="password" name="newPassword" placeholder="New Password (min 6 characters)" value={passwordForm.newPassword} onChange={handlePasswordFormChange} required disabled={isPasswordLoading} className="ck-input w-full" />
              <input type="password" name="confirmPassword" placeholder="Confirm New Password" value={passwordForm.confirmPassword} onChange={handlePasswordFormChange} required disabled={isPasswordLoading} className="ck-input w-full" />

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={closePasswordModal} className="ck-btn-secondary" disabled={isPasswordLoading}>Cancel</button>
                <button type="submit" disabled={isPasswordLoading} className="ck-btn-primary">
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
