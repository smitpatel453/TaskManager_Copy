"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, memo, Suspense, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { authApi } from "../../src/api/auth.api";
import { channelsApi } from "../../src/api/channels.api";
import { projectsApi } from "../../src/api/projects.api";
import { teamsApi } from "../../src/api/teams.api";
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

type SidebarProject = {
  _id: string;
  projectName: string;
  team?: { _id: string; teamName: string };
  assignedUsers?: Array<{ _id: string; firstName: string; lastName: string }>;
};

type GroupedProjects = {
  id: string;
  name: string;
  projects: SidebarProject[];
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
    href: "/dashboard/teams",
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

// ─── Main Sidebar ─────────────────────────────────────────────
export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const [openTeamIds, setOpenTeamIds] = useState<Record<string, boolean>>({});

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
  const [teamSearch, setTeamSearch] = useState("");
  const [showAllTeams, setShowAllTeams] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [newTeamPrivate, setNewTeamPrivate] = useState(false);
  const [teamMemberSearch, setTeamMemberSearch] = useState("");
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<string[]>([]);
  const [teamCreateError, setTeamCreateError] = useState("");
  const [isTeamCreating, setIsTeamCreating] = useState(false);

  const [isMounted, setIsMounted] = useState(false);
  const currentUserId = (user as (User & { _id?: string; id?: string }) | null)?._id || (user as (User & { _id?: string; id?: string }) | null)?.id || "";

  // Fetch projects
  const isAdmin = userRole === "admin";
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ["projects", isAdmin ? "admin" : "user"],
    queryFn: isAdmin ? projectsApi.getAllProjects : projectsApi.getMyProjects,
    enabled: !!userRole,
    staleTime: 5 * 60 * 1000,
  });
  const projects: SidebarProject[] = (projectsData?.data || []) as SidebarProject[];

  const { data: teamsData, isLoading: teamsLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: teamsApi.getTeams,
    enabled: !!userRole,
    staleTime: 5 * 60 * 1000,
  });
  const teams = teamsData?.data || [];

  const { data: teamUsersData, isLoading: teamUsersLoading } = useQuery({
    queryKey: ["users-dropdown"],
    queryFn: projectsApi.getAllUsersForDropdown,
    enabled: isTeamModalOpen,
    staleTime: 5 * 60 * 1000,
  });
  const teamUsers = teamUsersData?.data || [];

  const normalizedTeamSearch = teamSearch.trim().toLowerCase();
  const filteredTeams = useMemo(
    () =>
      teams.filter((team: { teamName?: string }) =>
        (team.teamName || "").toLowerCase().includes(normalizedTeamSearch)
      ),
    [teams, normalizedTeamSearch]
  );
  const hasActiveTeamSearch = normalizedTeamSearch.length > 0;
  const TEAM_SIDEBAR_LIMIT = 4;
  const teamsToShow = hasActiveTeamSearch || showAllTeams
    ? filteredTeams
    : filteredTeams.slice(0, TEAM_SIDEBAR_LIMIT);
  const canToggleMoreTeams = !hasActiveTeamSearch && filteredTeams.length > TEAM_SIDEBAR_LIMIT;

  const groupedProjectsByTeam = useMemo<GroupedProjects[]>(() => {
    const groups = new Map<string, GroupedProjects>();

    for (const team of teams) {
      groups.set(team._id, { id: team._id, name: team.teamName, projects: [] });
    }

    for (const project of projects) {
      const teamId = project.team?._id;
      const teamName = project.team?.teamName || "Ungrouped";

      if (!teamId) {
        if (!groups.has("ungrouped")) {
          groups.set("ungrouped", { id: "ungrouped", name: "Ungrouped", projects: [] });
        }
        groups.get("ungrouped")!.projects.push(project);
        continue;
      }

      if (!groups.has(teamId)) {
        groups.set(teamId, { id: teamId, name: teamName, projects: [] });
      }

      groups.get(teamId)!.projects.push(project);
    }

    return Array.from(groups.values());
  }, [projects, teams]);

  const toggleTeamOpen = (teamId: string) => {
    setOpenTeamIds((prev) => ({ ...prev, [teamId]: !(prev[teamId] ?? true) }));
  };

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

  const openTeamModal = () => {
    setTeamCreateError("");
    setNewTeamName("");
    setNewTeamDesc("");
    setNewTeamPrivate(false);
    setTeamMemberSearch("");
    setSelectedTeamMemberIds([]);
    setIsTeamModalOpen(true);
  };

  const closeTeamModal = () => {
    setIsTeamModalOpen(false);
    setTeamCreateError("");
    setTeamMemberSearch("");
  };

  const toggleTeamMember = (userId: string) => {
    setSelectedTeamMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleCreateTeam = async () => {
    setTeamCreateError("");

    if (!newTeamName.trim()) {
      setTeamCreateError("Team name is required");
      return;
    }

    try {
      setIsTeamCreating(true);
      await teamsApi.createTeam({
        teamName: newTeamName.trim(),
        description: newTeamDesc.trim(),
        isPrivate: newTeamPrivate,
        members: newTeamPrivate ? selectedTeamMemberIds : [],
      });

      await queryClient.invalidateQueries({ queryKey: ["teams"] });
      closeTeamModal();
    } catch (error) {
      setTeamCreateError(getApiErrorMessage(error, "Failed to create team"));
    } finally {
      setIsTeamCreating(false);
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
    return channels.filter((chan) => {
      if (!chan.isPrivate) return true;
      if (!currentUserId) return false;
      return (chan.members || []).some((m) => m._id === currentUserId);
    });
  }, [channels, currentUserId]);

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

  const renderProjectListIcon = (projectName: string, index: number) => {
    return (
      <svg width="14" height="14" viewBox="0 0 48 48" fill="currentColor" className="text-slate-700 dark:text-slate-400" xmlns="http://www.w3.org/2000/svg">
        <path clipRule="evenodd" strokeWidth="1" fillRule="evenodd" d="M27.5216 0.650893c-0.4405 -0.091897 -0.8783 -0.132327 -1.3002 -0.137486C25.5098 0.504704 24.7693 0.5 24 0.5c-4.7859 0 -8.4563 0.182059 -11.0112 0.376437C9.69689 1.12689 7.14783 3.664 6.90503 6.96494 6.7971 8.43227 6.6914 10.2938 6.61505 12.589c0.11548 -0.0146 0.23181 -0.027 0.34896 -0.0372 2.45278 -0.2129 5.79459 -0.4335 9.73849 -0.5174 3.4182 -0.0726 6.5619 1.6491 8.4078 4.4179l1.0365 1.5549c6.6695 0.0493 11.6216 0.3218 14.8562 0.5746 0.1661 0.0129 0.3306 0.0305 0.4935 0.0524 -0.0054 -1.0304 -0.0167 -2.0054 -0.033 -2.9266 -0.007 -0.4002 -0.0454 -0.8135 -0.1281 -1.2294 -2.3851 -0.0374 -4.7085 -0.1178 -6.659 -0.2023 -3.7805 -0.1636 -6.7887 -3.1718 -6.9523 -6.95232 -0.0846 -1.95423 -0.1652 -4.2828 -0.2025 -6.672687ZM40.104 11.4543c-0.8416 -1.59826 -2.1396 -3.61128 -4.0433 -5.51504 -1.9036 -1.90353 -3.9165 -3.20177 -5.5151 -4.04375 0.0417 1.89511 0.1072 3.71712 0.1757 5.29827 0.0963 2.2256 1.8593 3.98852 4.0849 4.08492 1.581 0.0684 3.4028 0.1339 5.2978 0.1756Zm-23.3492 3.0805c2.5351 -0.0538 4.8866 1.2235 6.2745 3.3052l1.3282 1.9923c0.2761 0.4142 0.749 0.6696 1.2603 0.6725 6.8691 0.0383 11.9323 0.3158 15.1895 0.5703 3.2929 0.2573 5.7294 3.0374 5.6179 6.3147 -0.2037 5.9848 -0.7851 10.8492 -1.2618 13.9924 -0.4579 3.0187 -2.8362 5.3115 -5.9074 5.5803 -3.0232 0.2646 -7.9201 0.5378 -15.2557 0.5378 -7.3358 0 -12.2329 -0.2732 -15.25625 -0.5378 -3.07601 -0.2692 -5.45094 -2.5781 -5.86404 -5.6159C2.3606 37.527 1.69673 30.9217 1.53613 21.369c-0.05463 -3.2491 2.35306 -6.0401 5.64314 -6.3256 2.40702 -0.2089 5.69383 -0.4261 9.57553 -0.5086Z" />
      </svg>
    );
  };

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
            const isActive = pathname === `/dashboard/channels/${chan.id}`;
            const isJoined = !!currentUserId && (chan.joinedMemberIds || []).includes(currentUserId);
            const showJoin = !isJoined;
            return (
              <div
                key={chan.id}
                className={`flex items-center justify-between px-2 py-1.5 rounded-md transition-all duration-150 group ${isActive
                  ? "bg-[var(--accent-light)] text-[var(--accent)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)] hover:text-[var(--text-primary)]"
                  }`}
              >
                <button
                  onClick={() => navigateTo(`/dashboard/channels/${chan.id}`)}
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
                      joinChannel(chan.id);
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
        <button
          onClick={() => navigateTo("/dashboard/teams")}
          className="w-5 h-5 rounded-md bg-[var(--bg-surface-2)] hover:bg-[var(--bg-surface-3)] text-[var(--text-secondary)] flex items-center justify-center transition-colors"
          title="New Space"
        >
          <PlusIcon className="w-3 h-3" />
        </button>
      </div>

      <button
        onClick={() => navigateTo("/dashboard/tasks")}
        className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-[var(--bg-surface-2)] transition-colors text-left"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)]">
          <path d="M9 6h11" />
          <path d="M9 12h11" />
          <path d="M9 18h11" />
          <path d="M4 6h.01" />
          <path d="M4 12h.01" />
          <path d="M4 18h.01" />
        </svg>
        <span className="text-[12px] text-[var(--text-secondary)] truncate">All Tasks - {user?.firstName}&apos;s Workspace</span>
      </button>

      {/* Projects tree */}
      {isMounted && (
        projectsLoading || teamsLoading ? (
          <SkeletonSidebarItems count={4} />
        ) : groupedProjectsByTeam.length > 0 ? (
          <div className="mt-1 space-y-1">
            {groupedProjectsByTeam.map((group, teamIndex) => {
              const teamOpen = openTeamIds[group.id] ?? true;
              const teamActive = group.projects.some((project) => pathname === "/dashboard/tasks" && searchParams.get("project") === project._id);
              const teamColor = teamIndex % 2 === 0 ? "from-indigo-500 to-blue-600" : "from-fuchsia-500 to-violet-600";

              return (
                <div key={group.id}>
                  <div className={`group flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${teamActive ? "bg-[var(--bg-surface-2)]" : "hover:bg-[var(--bg-surface-2)]"}`}>
                    <button
                      onClick={() => toggleTeamOpen(group.id)}
                      className="flex items-center gap-2 min-w-0 flex-1 text-left"
                    >
                      <svg width="20" height="20" viewBox="0 0 52 52" fill="none" className="flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M46.0082 39.8551C46.2484 36.5877 46.5 31.3996 46.5 24c0 -7.3996 -0.2516 -12.5877 -0.4918 -15.85507 -0.2409 -3.27646 -2.7354 -5.85313 -6.0324 -6.13517C36.9912 1.75444 32.4092 1.5 26 1.5c-6.4091 0 -10.9912 0.25443 -13.9758 0.50975 -3.29701 0.28204 -5.79145 2.85871 -6.03236 6.13517 -0.03087 0.41981 -0.06193 0.87133 -0.09261 1.35517 -0.5222 0.00098 -0.99999 0.00954 -1.42534 0.02206 -1.56772 0.04612 -2.90677 1.08015 -2.96243 2.75495C1.50412 12.498 1.5 12.7385 1.5 13s0.00412 0.5019 0.01146 0.7229c0.05566 1.6747 1.3947 2.7088 2.96243 2.7549 0.34125 0.0101 0.71627 0.0176 1.12088 0.0207 -0.03294 1.2367 -0.05889 2.5703 -0.07524 4.0037 -0.37595 0.0034 -0.72564 0.0105 -1.04564 0.0199 -1.56772 0.0462 -2.90677 1.0802 -2.96243 2.755C1.50412 23.498 1.5 23.7385 1.5 24s0.00412 0.5019 0.01146 0.7229c0.05566 1.6747 1.3947 2.7088 2.96243 2.7549 0.32 0.0095 0.66969 0.0166 1.04563 0.02 0.01636 1.4334 0.04231 2.767 0.07525 4.0037 -0.40462 0.0031 -0.77963 0.0106 -1.12088 0.0206 -1.56772 0.0462 -2.90677 1.0802 -2.96243 2.755C1.50412 34.498 1.5 34.7385 1.5 35s0.00412 0.5019 0.01146 0.7229c0.05566 1.6747 1.3947 2.7088 2.96243 2.7549 0.42534 0.0125 0.90314 0.0211 1.42533 0.0221 0.03068 0.4838 0.06174 0.9353 0.0926 1.3552 0.24092 3.2764 2.73535 5.8531 6.03238 6.1351 2.9846 0.2553 7.5666 0.5098 13.9758 0.5098 6.4091 0 10.9912 -0.2544 13.9758 -0.5098 3.297 -0.282 5.7915 -2.8587 6.0324 -6.1351ZM32.0008 20c0 2.1338 -1.1139 4.0075 -2.792 5.0713 2.8422 1.0417 5.0176 3.4147 5.7294 6.3412 0.3117 1.2813 -0.4381 2.4986 -1.7132 2.8349 -1.4247 0.3759 -3.7315 0.7526 -7.2549 0.7526 -3.5233 0 -5.8302 -0.3767 -7.2549 -0.7526 -1.275 -0.3363 -2.0248 -1.5536 -1.7131 -2.8349 0.715 -2.9399 2.9071 -5.3212 5.7684 -6.3554 -1.6657 -1.0662 -2.7697 -2.9327 -2.7697 -5.0571 0 -3.3137 2.6863 -6 6 -6s6 2.6863 6 6Z" fill="currentColor" />
                      </svg>
                      <span className="text-[12px] font-medium text-[var(--text-primary)] truncate">{group.name}</span>
                    </button>

                    <button className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-opacity">
                      <EllipsisHorizontalIcon className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => navigateTo("/dashboard/projects")}
                      className="opacity-0 group-hover:opacity-100 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-opacity"
                    >
                      <PlusIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {teamOpen && (
                    <div className="ml-4 mt-0.5 border-l border-[var(--border-subtle)]/80 pl-2 space-y-0.5">
                      {group.projects.map((project, index) => {
                        const isActive = pathname === "/dashboard/tasks" && searchParams.get("project") === project._id;
                        return (
                          <button
                            key={project._id}
                            onClick={() => navigateTo(`/dashboard/tasks?project=${project._id}`)}
                            className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors ${isActive ? "bg-[var(--bg-surface-2)]" : "hover:bg-[var(--bg-surface-2)]"}`}
                          >
                            {renderProjectListIcon(project.projectName, index)}
                            <span className={`text-[12px] truncate flex-1 ${isActive ? "text-[var(--text-primary)] font-medium" : "text-[var(--text-secondary)]"}`}>
                              {project.projectName}
                            </span>
                            <span className="text-[12px] text-[var(--text-muted)]">{project.assignedUsers?.length || 0}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            <button
              onClick={() => navigateTo("/dashboard/teams")}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--bg-surface-2)] transition-colors text-left"
            >
              <PlusIcon className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-[12px] text-[var(--text-tertiary)]">New Space</span>
            </button>
          </div>
        ) : null
      )}
    </div>
  );

  const renderTeamsPanel = () => (
    <div className="flex-1 overflow-y-auto py-3 ck-scrollbar px-2">
      <div className="flex items-center justify-between px-2 pb-3">
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">Teams</span>
        <button
          onClick={openTeamModal}
          className="p-1 rounded hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)]"
          title="Create team"
        >
          <PlusIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="space-y-0.5">
        {[
          { label: "All People", href: "/dashboard/teams", icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4" /><path d="M4 20a8 8 0 1 1 16 0" /></svg>, count: teams.reduce((acc, t) => acc + (t.members?.length || 0), 0) },
          { label: "Analytics", href: "/dashboard/teams", icon: <ChartBarIcon className="w-3.5 h-3.5" /> },
        ].map((item) => (
          <ContentPanelItem key={item.label} href={item.href} label={item.label} icon={item.icon} rightText={item.count ? String(item.count) : undefined} onNavigate={navigateTo} />
        ))}
      </div>

      <div className="my-3 border-t border-[var(--border-subtle)]" />

      <div className="px-2 py-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">My Teams</span>
        <button
          onClick={openTeamModal}
          className="p-1 rounded hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)]"
          title="Create team"
        >
          <PlusIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-2 mt-1">
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-canvas)] focus-within:border-[var(--border-default)] transition-colors">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-[var(--text-muted)] flex-shrink-0"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3-3" />
          </svg>
          <input
            type="text"
            value={teamSearch}
            onChange={(e) => setTeamSearch(e.target.value)}
            placeholder="Search teams"
            className="no-focus-ring w-full bg-transparent border-0 outline-none focus:outline-none focus-visible:outline-none text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </div>
      </div>

      {teamsLoading ? (
        <div className="px-2 py-2 text-[11px] text-[var(--text-muted)]">Loading teams...</div>
      ) : filteredTeams.length === 0 ? (
        <div className="px-2 py-2 text-[11px] text-[var(--text-muted)]">No teams found</div>
      ) : (
        <div className="space-y-0.5 mt-1">
          {teamsToShow.map((team) => (
            <button
              key={team._id}
              onClick={() => navigateTo("/dashboard/teams")}
              className="w-full flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-[var(--bg-surface-2)] transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 52 52" fill="none" className="flex-shrink-0" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M46.0082 39.8551C46.2484 36.5877 46.5 31.3996 46.5 24c0 -7.3996 -0.2516 -12.5877 -0.4918 -15.85507 -0.2409 -3.27646 -2.7354 -5.85313 -6.0324 -6.13517C36.9912 1.75444 32.4092 1.5 26 1.5c-6.4091 0 -10.9912 0.25443 -13.9758 0.50975 -3.29701 0.28204 -5.79145 2.85871 -6.03236 6.13517 -0.03087 0.41981 -0.06193 0.87133 -0.09261 1.35517 -0.5222 0.00098 -0.99999 0.00954 -1.42534 0.02206 -1.56772 0.04612 -2.90677 1.08015 -2.96243 2.75495C1.50412 12.498 1.5 12.7385 1.5 13s0.00412 0.5019 0.01146 0.7229c0.05566 1.6747 1.3947 2.7088 2.96243 2.7549 0.34125 0.0101 0.71627 0.0176 1.12088 0.0207 -0.03294 1.2367 -0.05889 2.5703 -0.07524 4.0037 -0.37595 0.0034 -0.72564 0.0105 -1.04564 0.0199 -1.56772 0.0462 -2.90677 1.0802 -2.96243 2.755C1.50412 23.498 1.5 23.7385 1.5 24s0.00412 0.5019 0.01146 0.7229c0.05566 1.6747 1.3947 2.7088 2.96243 2.7549 0.32 0.0095 0.66969 0.0166 1.04563 0.02 0.01636 1.4334 0.04231 2.767 0.07525 4.0037 -0.40462 0.0031 -0.77963 0.0106 -1.12088 0.0206 -1.56772 0.0462 -2.90677 1.0802 -2.96243 2.755C1.50412 34.498 1.5 34.7385 1.5 35s0.00412 0.5019 0.01146 0.7229c0.05566 1.6747 1.3947 2.7088 2.96243 2.7549 0.42534 0.0125 0.90314 0.0211 1.42533 0.0221 0.03068 0.4838 0.06174 0.9353 0.0926 1.3552 0.24092 3.2764 2.73535 5.8531 6.03238 6.1351 2.9846 0.2553 7.5666 0.5098 13.9758 0.5098 6.4091 0 10.9912 -0.2544 13.9758 -0.5098 3.297 -0.282 5.7915 -2.8587 6.0324 -6.1351ZM32.0008 20c0 2.1338 -1.1139 4.0075 -2.792 5.0713 2.8422 1.0417 5.0176 3.4147 5.7294 6.3412 0.3117 1.2813 -0.4381 2.4986 -1.7132 2.8349 -1.4247 0.3759 -3.7315 0.7526 -7.2549 0.7526 -3.5233 0 -5.8302 -0.3767 -7.2549 -0.7526 -1.275 -0.3363 -2.0248 -1.5536 -1.7131 -2.8349 0.715 -2.9399 2.9071 -5.3212 5.7684 -6.3554 -1.6657 -1.0662 -2.7697 -2.9327 -2.7697 -5.0571 0 -3.3137 2.6863 -6 6 -6s6 2.6863 6 6Z" fill="currentColor"></path></svg>
              <span className="text-[12px] font-medium text-[var(--text-primary)] truncate text-left flex-1">{team.teamName}</span>
            </button>
          ))}
          {canToggleMoreTeams && (
            <button
              onClick={() => setShowAllTeams((prev) => !prev)}
              className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--bg-surface-2)] rounded-md transition-colors"
            >
              {showAllTeams ? "Show less" : "More.."}
            </button>
          )}
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

      {/* ── Create Team Modal ── */}
      {isTeamModalOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={closeTeamModal}
        >
          <div
            className="w-full max-w-[520px] rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative pt-6 px-7 pb-3 border-b border-[var(--border-subtle)]">
              <button
                onClick={closeTeamModal}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[var(--bg-surface-2)] text-[var(--text-muted)] transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
              <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Create Team</h2>
              <p className="text-[13px] text-[var(--text-tertiary)] mt-1">
                Create a team and optionally invite members for private collaboration.
              </p>
            </div>

            <div className="px-7 py-5 space-y-4">
              {teamCreateError && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-[12px] text-[var(--status-error)]">
                  {teamCreateError}
                </div>
              )}

              <div>
                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Team Name</label>
                <input
                  autoFocus
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Product Team"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              <div>
                <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
                <input
                  value={newTeamDesc}
                  onChange={(e) => setNewTeamDesc(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={newTeamPrivate}
                  onChange={(e) => setNewTeamPrivate(e.target.checked)}
                />
                Private team
              </label>

              {newTeamPrivate && (
                <div>
                  <label className="block text-[13px] font-medium text-[var(--text-secondary)] mb-1.5">Invite Members</label>
                  <input
                    value={teamMemberSearch}
                    onChange={(e) => setTeamMemberSearch(e.target.value)}
                    placeholder="Search users"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] mb-2"
                  />

                  <div className="max-h-40 overflow-y-auto border border-[var(--border-subtle)] rounded-lg divide-y divide-[var(--border-subtle)]">
                    {teamUsersLoading ? (
                      <div className="px-3 py-2 text-[12px] text-[var(--text-tertiary)]">Loading users...</div>
                    ) : (
                      teamUsers
                        .filter((u) =>
                          `${u.fullName} ${u.email}`
                            .toLowerCase()
                            .includes(teamMemberSearch.trim().toLowerCase())
                        )
                        .map((u) => (
                          <label
                            key={u._id}
                            className="flex items-center justify-between gap-2 px-3 py-2 text-[12px] text-[var(--text-primary)] hover:bg-[var(--bg-surface-2)]"
                          >
                            <div className="min-w-0">
                              <p className="truncate">{u.fullName}</p>
                              <p className="truncate text-[11px] text-[var(--text-muted)]">{u.email}</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={selectedTeamMemberIds.includes(u._id)}
                              onChange={() => toggleTeamMember(u._id)}
                            />
                          </label>
                        ))
                    )}
                  </div>

                  <p className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                    {selectedTeamMemberIds.length} selected
                  </p>
                </div>
              )}
            </div>

            <div className="px-7 py-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
              <button
                onClick={closeTeamModal}
                className="px-4 py-2 rounded-lg text-[13px] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface-2)]"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTeam}
                disabled={isTeamCreating}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-50"
              >
                {isTeamCreating ? "Creating..." : "Create Team"}
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
