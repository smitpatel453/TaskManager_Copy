"use client";

import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef, memo, Suspense, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { authApi } from "../../src/api/auth.api";
import { channelsApi } from "../../src/api/channels.api";
import { projectsApi } from "../../src/api/projects.api";
import { teamsApi } from "../../src/api/teams.api";
import { useNotifications } from "../hooks/useNotifications";
import { SkeletonSidebarItems } from "./Skeleton";
import { useCall } from "../providers/CallProvider";
import { AgentAudioVisualizerRadial } from "@/components/agent-audio-visualizer-radial";
import { Tooltip } from "primereact/tooltip";

/* ─── Types ─────────────────────────────────────────────────── */
type ChannelMember = { _id: string; firstName: string; lastName: string; email?: string };
type StoredChannel = {
  id: string;
  name: string;
  members?: ChannelMember[];
  isPrivate?: boolean;
  createdBy?: string;
  joinedMemberIds?: string[];
  joined?: boolean;
};
type SidebarProject = {
  _id: string;
  projectName: string;
  team?: { _id: string; teamName: string };
  assignedUsers?: Array<{ _id: string; firstName: string; lastName: string }>;
};
type GroupedProjects = { id: string; name: string; projects: SidebarProject[] };
type User = { _id?: string; id?: string; firstName: string; lastName: string; email: string; role?: "admin" | "user"; avatar?: string };

interface SidebarProps { userRole?: "admin" | "user"; }

/* ─── Task Filters (uses searchParams, needs Suspense) ───────── */
const TaskFilters = memo(function TaskFilters({
  pathname, user, onNavigate,
}: { pathname: string; myTasksOpen: boolean; user: User | null; onNavigate: (url: string) => void }) {
  const searchParams = useSearchParams();
  const items = [
    {
      key: "assigned", href: "/dashboard/tasks?filter=assigned", label: "Assigned to me",
      icon: "pi pi-user",
      isActive: pathname === "/dashboard/tasks" && searchParams.get("filter") === "assigned",
    },
    {
      key: "all", href: "/dashboard/tasks", label: "All Tasks",
      icon: "pi pi-list-check",
      isActive: pathname === "/dashboard/tasks" && !searchParams.get("filter"),
    },
    {
      key: "created", href: "/dashboard/tasks?filter=created", label: "Personal List",
      icon: "pi pi-file-edit",
      isActive: pathname === "/dashboard/tasks" && searchParams.get("filter") === "created",
    },
  ];
  return (
    <div className="py-0.5 space-y-0.5">
      {items.map((item) => (
        <NavItem key={item.key} icon={item.icon} label={item.label} active={item.isActive}
          onClick={() => onNavigate(item.href)} indent />
      ))}
    </div>
  );
});

/* ─── Reusable NavItem ───────────────────────────────────────── */
function NavItem({
  icon, label, active, onClick, badge, indent, isCollapsed, children,
}: {
  icon: string; label: string; active?: boolean; onClick?: () => void;
  badge?: number | string; indent?: boolean; isCollapsed?: boolean; children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      data-pr-tooltip={label}
      data-pr-position="right"
      data-pr-at="right+10 center"
      className={`nav-item-tooltip w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] text-left transition-all duration-150 group relative
        ${indent && !isCollapsed ? "pl-7" : ""}
        ${active
          ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] font-medium"
          : "text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]"
        }
        ${isCollapsed ? "justify-center px-0" : ""}
      `}
    >
      <i className={`${icon} text-[14px] flex-shrink-0 ${active ? "text-white" : "text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]"} ${isCollapsed ? "mx-auto" : ""}`} />
      {!isCollapsed && <span className="truncate flex-1">{label}</span>}
      {children}
      {!isCollapsed && badge !== undefined && (
        <span className={`ml-auto text-[11px] px-1.5 py-0.5 rounded-md font-medium flex-shrink-0
          ${active ? "bg-white/20 text-white" : "bg-[var(--badge-bg)] text-[var(--badge-text)]"}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

/* ─── Section Header ─────────────────────────────────────────── */
function SectionHeader({
  label, onAdd, onToggle, isOpen, isCollapsed,
}: { label: string; onAdd?: () => void; onToggle?: () => void; isOpen?: boolean; isCollapsed?: boolean }) {
  if (isCollapsed) return <div className="mx-4 my-4 h-px bg-[var(--border-subtle)]" />;
  
  return (
    <div className="flex items-center justify-between px-2.5 pt-4 pb-1 group">
      <button onClick={onToggle} className="flex items-center gap-1 flex-1 text-left">
        <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{label}</span>
        {onToggle && (
          <i className={`pi pi-chevron-right text-[9px] text-[var(--text-muted)] transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
        )}
      </button>
      {onAdd && (
        <button
          onClick={onAdd}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-[var(--nav-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all"
          title={`Add ${label}`}
        >
          <i className="pi pi-plus text-[11px]" />
        </button>
      )}
    </div>
  );
}

/* ─── Main Sidebar ───────────────────────────────────────────── */
export default function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { currentAudioTrack, setCurrentAudioTrack } = useCall();
  const { unreadCount } = useNotifications();

  /* ── State ── */
  const [user, setUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  /* Dropdowns */
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* Password modal */
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  /* Collapsibles */
  const [channelsOpen, setChannelsOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load and persist collapse state
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setIsCollapsed(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(isCollapsed));
    // Update CSS variable for the layout if needed
    document.documentElement.style.setProperty("--sidebar-width", isCollapsed ? "72px" : "260px");
  }, [isCollapsed]);
  const [channelsExpanded, setChannelsExpanded] = useState(false);
  const [spacesOpen, setSpacesOpen] = useState(true);
  const [teamsOpen, setTeamsOpen] = useState(true);
  const [openTeamIds, setOpenTeamIds] = useState<Record<string, boolean>>({});
  const [expandedProjectTeams, setExpandedProjectTeams] = useState<Record<string, boolean>>({});
  const [myTasksOpen, setMyTasksOpen] = useState(false);
  const [showAllTeams, setShowAllTeams] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");

  /* Channels */
  const [channels, setChannels] = useState<StoredChannel[]>([]);
  const [channelSearch, setChannelSearch] = useState("");
  const CHANNEL_SIDEBAR_LIMIT = 5;

  /* Create Channel modal */
  const [isChannelModalOpen, setIsChannelModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [newChannelPrivacy, setNewChannelPrivacy] = useState<"public" | "private">("public");
  const [allUsers, setAllUsers] = useState<ChannelMember[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<ChannelMember[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);

  /* Create Team modal */
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDesc, setNewTeamDesc] = useState("");
  const [newTeamPrivate, setNewTeamPrivate] = useState(false);
  const [teamMemberSearch, setTeamMemberSearch] = useState("");
  const [selectedTeamMemberIds, setSelectedTeamMemberIds] = useState<string[]>([]);
  const [teamCreateError, setTeamCreateError] = useState("");
  const [isTeamCreating, setIsTeamCreating] = useState(false);

  /* Derived */
  const isAdmin = userRole === "admin";
  const currentUserId =
    (user as any)?._id || (user as any)?.id || (user as any)?.userId || "";

  /* ── Queries ── */
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
    enabled: !!userRole,
    staleTime: 5 * 60 * 1000,
  });
  const teamUsers = teamUsersData?.data || [];

  /* ── Computed ── */
  const normalizedTeamSearch = teamSearch.trim().toLowerCase();
  const filteredTeams = useMemo(() =>
    teams.filter((team: { teamName?: string }) =>
      (team.teamName || "").toLowerCase().includes(normalizedTeamSearch)
    ), [teams, normalizedTeamSearch]);

  const TEAM_SIDEBAR_LIMIT = 4;
  const hasActiveTeamSearch = normalizedTeamSearch.length > 0;
  const teamsToShow = hasActiveTeamSearch || showAllTeams ? filteredTeams : filteredTeams.slice(0, TEAM_SIDEBAR_LIMIT);
  const canToggleMoreTeams = !hasActiveTeamSearch && filteredTeams.length > TEAM_SIDEBAR_LIMIT;

  const groupedProjectsByTeam = useMemo<GroupedProjects[]>(() => {
    const groups = new Map<string, GroupedProjects>();
    for (const team of teams) groups.set(team._id, { id: team._id, name: team.teamName, projects: [] });
    for (const project of projects) {
      const teamId = project.team?._id;
      const teamName = project.team?.teamName || "Ungrouped";
      if (!teamId) {
        if (!groups.has("ungrouped")) groups.set("ungrouped", { id: "ungrouped", name: "Ungrouped", projects: [] });
        groups.get("ungrouped")!.projects.push(project);
        continue;
      }
      if (!groups.has(teamId)) groups.set(teamId, { id: teamId, name: teamName, projects: [] });
      groups.get(teamId)!.projects.push(project);
    }
    return Array.from(groups.values());
  }, [projects, teams]);

  const visibleChannels = useMemo(() => {
    if (!channelSearch.trim()) return channels;
    return channels.filter((c) => c.name.toLowerCase().includes(channelSearch.toLowerCase().trim()));
  }, [channels, channelSearch]);

  const PROJECT_SIDEBAR_LIMIT = 4;

  /* ── Effects ── */
  useEffect(() => { setIsMounted(true); }, []);

  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) { try { setUser(JSON.parse(storedUser)); } catch { } }
    };
    
    loadUser();

    if (typeof window !== "undefined") {
      const storedTheme = localStorage.getItem("theme-mode");
      const isDark = storedTheme ? storedTheme === "dark" : document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
      if (isDark) document.documentElement.classList.add("dark");
      else document.documentElement.classList.remove("dark");

      // Listen for profile updates from settings page
      window.addEventListener("user-profile-updated", loadUser);
      
      const loadTheme = () => {
        const storedTheme = localStorage.getItem("theme-mode");
        const isDark = storedTheme === "dark" || document.documentElement.classList.contains("dark");
        setIsDarkMode(isDark);
      };
      
      const loadAccentColor = () => {
        const color = localStorage.getItem("accent-color");
        if (color) {
          const root = document.documentElement;
          root.style.setProperty("--accent", color);
          root.style.setProperty("--ring", color);
          root.style.setProperty("--sidebar-ring", color);
          root.style.setProperty("--ck-blue", color);
          root.style.setProperty("--chart-1", color);
          root.style.setProperty("--accent-hover", color + "CC");
        }
      };

      window.addEventListener("appearance-updated", loadTheme);
      window.addEventListener("accent-color-updated", loadAccentColor);

      loadAccentColor(); // Apply on mount

      return () => {
        window.removeEventListener("user-profile-updated", loadUser);
        window.removeEventListener("appearance-updated", loadTheme);
        window.removeEventListener("accent-color-updated", loadAccentColor);
      };
    }
  }, []);

  useEffect(() => {
    const loadChannels = async () => {
      try {
        const data = await channelsApi.getChannels();
        setChannels(data as unknown as StoredChannel[]);
      } catch (error) {
        setChannels([]);
      }
    };
    loadChannels();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsDropdownOpen(false);
    };
    if (isDropdownOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isDropdownOpen]);

  /* ── Handlers ── */
  const navigateTo = (url: string) => { router.push(url); };

  const toggleTheme = () => {
    const newDark = !isDarkMode;
    setIsDarkMode(newDark);
    if (newDark) { document.documentElement.classList.add("dark"); localStorage.setItem("theme-mode", "dark"); }
    else { document.documentElement.classList.remove("dark"); localStorage.setItem("theme-mode", "light"); }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    // Dispatch custom event to trigger notification refresh on sign in
    window.dispatchEvent(new CustomEvent("authChange"));
    window.location.href = "/";
  };

  const getApiErrorMessage = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
      const data = err.response?.data as { error?: string; message?: string } | undefined;
      return data?.error || data?.message || err.message || fallback;
    }
    if (err instanceof Error) return err.message;
    return fallback;
  };

  /* Password modal */
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

  /* Channel modal */
  const openChannelModal = async () => {
    setIsChannelModalOpen(true);
    setNewChannelName(""); setNewChannelPrivacy("public");
    setSelectedMembers([]); setMemberSearch("");
    setUsersLoading(true);
    try { const users = await channelsApi.getUsers(); setAllUsers(users); }
    catch { setAllUsers([]); }
    finally { setUsersLoading(false); }
  };
  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) { setIsChannelModalOpen(false); return; }
    const creator: ChannelMember | null = user ? { _id: currentUserId || "me", firstName: user.firstName, lastName: user.lastName, email: user.email } : null;
    const baseMembers = newChannelPrivacy === "private" ? selectedMembers : [];
    const allChannelMembers = creator ? [creator, ...baseMembers.filter((m) => m._id !== creator._id)] : baseMembers;
    try {
      const created = await channelsApi.createChannel({
        name: newChannelName.trim(),
        isPrivate: newChannelPrivacy === "private",
        members: (newChannelPrivacy === "private" ? allChannelMembers : []).map((m) => m._id),
      });
      setChannels((prev) => [...prev, created as unknown as StoredChannel]);
      setNewChannelName(""); setNewChannelPrivacy("public"); setSelectedMembers([]);
      setIsChannelModalOpen(false);
      navigateTo(`/dashboard/channels/${created.id}`);
    } catch (error) { console.error("Failed to create channel", error); }
  };
  const toggleMember = (u: ChannelMember) => {
    setSelectedMembers((prev) => prev.find((m) => m._id === u._id) ? prev.filter((m) => m._id !== u._id) : [...prev, u]);
  };
  const joinChannel = async (channelId: string) => {
    if (!currentUserId) return;
    try {
      const joinedChannel = await channelsApi.joinChannel(channelId);
      setChannels((prev) => prev.map((chan) => (chan.id === channelId ? (joinedChannel as unknown as StoredChannel) : chan)));
    } catch (error) { console.error("Failed to join channel", error); }
  };

  /* Team modal */
  const openTeamModal = () => {
    setTeamCreateError(""); setNewTeamName(""); setNewTeamDesc("");
    setNewTeamPrivate(false); setTeamMemberSearch(""); setSelectedTeamMemberIds([]);
    setIsTeamModalOpen(true);
  };
  const closeTeamModal = () => { setIsTeamModalOpen(false); setTeamCreateError(""); setTeamMemberSearch(""); };
  const toggleTeamMember = (userId: string) => {
    setSelectedTeamMemberIds((prev) => prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]);
  };
  const handleCreateTeam = async () => {
    setTeamCreateError("");
    if (!newTeamName.trim()) { setTeamCreateError("Team name is required"); return; }
    try {
      setIsTeamCreating(true);
      await teamsApi.createTeam({ teamName: newTeamName.trim(), description: newTeamDesc.trim(), isPrivate: newTeamPrivate, members: newTeamPrivate ? selectedTeamMemberIds : [] });
      await queryClient.invalidateQueries({ queryKey: ["teams"] });
      closeTeamModal();
    } catch (error) { setTeamCreateError(getApiErrorMessage(error, "Failed to create team")); }
    finally { setIsTeamCreating(false); }
  };

  const toggleTeamOpen = (teamId: string) => setOpenTeamIds((prev) => ({ ...prev, [teamId]: !(prev[teamId] ?? true) }));
  const toggleProjectTeamExpanded = (teamId: string) => setExpandedProjectTeams((prev) => ({ ...prev, [teamId]: !(prev[teamId] ?? false) }));

  /* ── Main nav items ── */
  const topNavItems = [
    { id: "home", label: "Home", icon: "pi pi-home", href: "/dashboard" },
    { id: "tasks", label: "Tasks", icon: "pi pi-list-check", href: "/dashboard/tasks" },
  ];

  const bottomNavItems = [
    { id: "inbox", label: "Inbox", icon: "pi pi-inbox", href: "/dashboard/inbox" },
    ...(isAdmin ? [
      { id: "projects", label: "Projects", icon: "pi pi-folder", href: "/dashboard/projects" },
      { id: "users", label: "Users", icon: "pi pi-user", href: "/dashboard/users" },
    ] : [
      ...(projects.length > 0 ? [{ id: "projects", label: "Projects", icon: "pi pi-folder", href: "/dashboard/projects" }] : []),
    ]),
  ];

  const employeeNavItems = !isAdmin ? [
    { id: "my-teams", label: "My Teams", icon: "pi pi-users", href: "/dashboard/teams" },
  ] : [];

  /* ── Shared Sidebar Content ── */
  const SidebarContent = ({ onClose, isCollapsed }: { onClose?: () => void; isCollapsed?: boolean }) => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Workspace Header ── */}
      <div className={`px-3 pt-3 pb-2 border-b border-[var(--border-subtle)] flex-shrink-0 transition-all ${isCollapsed ? "px-0" : ""}`}>
        <div className={`flex items-center gap-2.5 px-1 ${isCollapsed ? "justify-center" : ""}`}>
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0 shadow-sm">
            {user?.firstName?.charAt(0) || "W"}
          </div>
          {!isCollapsed && (
            <>
              <span className="flex-1 text-[13px] font-semibold text-[var(--text-primary)] truncate">
                {user ? `${user.firstName}'s Workspace` : "Workspace"}
              </span>
              <button
                className="p-1 rounded-md hover:bg-[var(--nav-hover-bg)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors flex-shrink-0"
                title="Search"
              >
                <i className="pi pi-search text-[13px]" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Scrollable Content ── */}
      <div className="flex-1 overflow-y-auto ck-scrollbar px-2 py-2 space-y-0.5">
        
        {/* Top Nav (Home, Tasks) */}
        {topNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <NavItem key={item.id} icon={item.icon} label={item.label} active={isActive} isCollapsed={isCollapsed}
              onClick={() => { navigateTo(item.href); onClose?.(); }}
            />
          );
        })}

        {/* Employee Nav Items (My Teams, Projects) */}
        {employeeNavItems.filter(item => item.id !== "my-teams").map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <NavItem key={item.id} icon={item.icon} label={item.label} active={isActive} isCollapsed={isCollapsed}
              onClick={() => { navigateTo(item.href); onClose?.(); }}
            />
          );
        })}

        {/* Teams Section (Between Tasks and Inbox) */}
        {(teams.length > 0 || isAdmin) && (
          <div className="py-1">
            <SectionHeader label="Teams" onAdd={isAdmin ? openTeamModal : undefined} onToggle={() => setTeamsOpen(v => !v)} isOpen={teamsOpen} isCollapsed={isCollapsed} />
            {teamsOpen && !isCollapsed && (
              <div className="space-y-0.5 mt-1">
                {/* Analytics */}
                <NavItem 
                  icon="pi pi-chart-bar" 
                  label="Analytics" 
                  active={pathname === "/dashboard/teams"}
                  onClick={() => { navigateTo("/dashboard/teams"); onClose?.(); }}
                />

                <div className="px-2.5 pt-3 pb-1">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">My Teams</span>
                </div>

                {/* Team Search */}
                <div className="px-1 mb-1">
                  <div className="flex items-center gap-2 mx-1 px-2 py-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] focus-within:border-[var(--border-default)] transition-colors">
                    <i className="pi pi-search text-[10px] text-[var(--text-muted)] flex-shrink-0" />
                    <input
                      type="text" 
                      value={teamSearch}
                      onChange={(e) => setTeamSearch(e.target.value)}
                      placeholder="Search teams"
                      className="no-focus-ring w-full bg-transparent border-0 outline-none text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                </div>

                {/* Team List */}
                {teamsLoading ? <SkeletonSidebarItems count={2} /> : teamsToShow.map((team: any) => (
                  <NavItem key={team._id} icon="pi pi-users" label={team.teamName}
                    active={pathname.includes(`/dashboard/teams/${team._id}`)}
                    onClick={() => { navigateTo(`/dashboard/teams/${team._id}`); onClose?.(); }}
                  />
                ))}

                {canToggleMoreTeams && (
                  <button onClick={() => setShowAllTeams(v => !v)}
                    className="w-full text-left px-2.5 py-1 text-[12px] text-[var(--accent)] hover:bg-[var(--nav-hover-bg)] rounded-lg">
                    {showAllTeams ? "Show less" : "More.."}
                  </button>
                )}

                {isAdmin && (
                  <button onClick={() => { openTeamModal(); onClose?.(); }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] text-left text-[var(--text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-secondary)] transition-all">
                    <i className="pi pi-plus text-[12px]" />
                    <span>New Team</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bottom Nav (Inbox, Projects, Users) */}
        {bottomNavItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          // Get notification badge for Inbox
          const notificationBadge = item.id === "inbox" ? (unreadCount > 0 ? unreadCount : undefined) : undefined;
          return (
            <NavItem key={item.id} icon={item.icon} label={item.label} active={isActive} isCollapsed={isCollapsed}
              badge={notificationBadge}
              onClick={() => { navigateTo(item.href); onClose?.(); }}
            />
          );
        })}

        {/* Channels Section */}
        <SectionHeader label="Channels" onAdd={openChannelModal} onToggle={() => setChannelsOpen(v => !v)} isOpen={channelsOpen} isCollapsed={isCollapsed} />

        {channelsOpen && !isCollapsed && (
          <div className="space-y-0.5">
            {/* Channel search */}
            {channels.length > 3 && (
              <div className="flex items-center gap-2 mx-1 px-2.5 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] focus-within:border-[var(--border-default)] transition-colors mb-1">
                <i className="pi pi-search text-[11px] text-[var(--text-muted)] flex-shrink-0" />
                <input
                  type="text" value={channelSearch}
                  onChange={(e) => setChannelSearch(e.target.value)}
                  placeholder="Search channels"
                  className="no-focus-ring w-full bg-transparent border-0 outline-none text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                />
              </div>
            )}

            {isMounted && visibleChannels.slice(0, channelsExpanded ? undefined : CHANNEL_SIDEBAR_LIMIT).map((chan) => {
              const channelId = ((chan as any).id || (chan as any).channelId || "").toLowerCase();
              const isActive = pathname === `/dashboard/channels/${channelId}`;
              const isJoined = !!(chan.joined || (!!currentUserId && (chan.joinedMemberIds || []).includes(currentUserId)));
              return (
                <div key={channelId || chan.name} className="group relative">
                  <button
                    onClick={() => { navigateTo(`/dashboard/channels/${channelId}`); onClose?.(); }}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] text-left transition-all duration-150 pr-12
                      ${isActive
                        ? "bg-[var(--nav-active-bg)] text-[var(--nav-active-text)] font-medium"
                        : "text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-primary)]"
                      }`}
                  >
                    {chan.isPrivate
                      ? <i className={`pi pi-lock text-[12px] flex-shrink-0 ${isActive ? "text-white" : "text-[var(--text-muted)]"}`} />
                      : <i className={`pi pi-hashtag text-[12px] flex-shrink-0 ${isActive ? "text-white" : "text-[var(--text-muted)]"}`} />
                    }
                    <span className="truncate flex-1">{chan.name}</span>
                  </button>
                  {!isJoined && (
                    <button
                      onClick={(e) => { e.stopPropagation(); joinChannel(channelId); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg-surface-3)] text-[var(--text-secondary)] hover:bg-[var(--ck-blue)] hover:text-white transition-all"
                    >
                      Join
                    </button>
                  )}
                </div>
              );
            })}

            {visibleChannels.length > CHANNEL_SIDEBAR_LIMIT && (
              <button
                onClick={() => setChannelsExpanded(!channelsExpanded)}
                className="w-full text-left px-2.5 py-1.5 text-[12px] font-medium text-[var(--accent)] hover:bg-[var(--nav-hover-bg)] rounded-lg transition-colors"
              >
                {channelsExpanded ? "Show less" : `+${visibleChannels.length - CHANNEL_SIDEBAR_LIMIT} more`}
              </button>
            )}

            <button
              onClick={openChannelModal}
              className="w-full flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-[13px] text-left group text-[var(--text-muted)] hover:bg-[var(--nav-hover-bg)] hover:text-[var(--text-secondary)] transition-all"
            >
              <i className="pi pi-plus text-[12px]" />
              <span>Add Channel</span>
            </button>
          </div>
        )}


      </div>
      {/* ── Footer ── */}
      <div className={`border-t border-[var(--border-subtle)] px-2 py-2 flex-shrink-0 transition-all ${isCollapsed ? "px-1" : ""}`}>
        {user && (
          <div className="relative" ref={dropdownRef}>
            <div
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[var(--nav-hover-bg)] transition-all group cursor-pointer select-none ${isCollapsed ? "justify-center px-1" : ""}`}
            >
              {currentAudioTrack ? (
                <AgentAudioVisualizerRadial
                  audioTrack={currentAudioTrack || undefined}
                  state="speaking"
                  size="icon" color="#6366f1"
                >
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold shadow-sm ring-2 ring-[var(--bg-surface)]">
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.classList.remove('p-0');
                        }}
                      />
                    ) : (
                      <span className="text-[11px]">{user.firstName?.charAt(0)}{user.lastName?.charAt(0)}</span>
                    )}
                  </div>
                </AgentAudioVisualizerRadial>
              ) : (
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold shadow-sm ring-2 ring-[var(--bg-surface)]">
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).parentElement!.classList.remove('p-0');
                      }}
                    />
                  ) : (
                    <span className="text-[11px]">{user.firstName?.charAt(0)}{user.lastName?.charAt(0)}</span>
                  )}
                </div>
              )}
              
              {!isCollapsed && (
                <>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[12px] font-medium text-[var(--text-primary)] truncate">{user.firstName} {user.lastName}</p>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleTheme(); }}
                      className="p-1 rounded-md hover:bg-[var(--bg-surface-3)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                      title={isDarkMode ? "Light mode" : "Dark mode"}
                    >
                      <i className={`${isDarkMode ? "pi pi-sun" : "pi pi-moon"} text-[12px]`} />
                    </button>
                    <i className={`pi pi-chevron-up text-[10px] text-[var(--text-muted)] transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                  </div>
                </>
              )}
            </div>

            {isDropdownOpen && (
              <div className={`absolute bottom-full mb-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-lg py-1 z-50 animate-fade-in
                ${isCollapsed ? "left-12 min-w-[180px] bottom-0" : "left-0 right-0"}
              `}>
                {isCollapsed && (
                   <div className="px-3 py-2 border-b border-[var(--border-subtle)] mb-1 flex items-center gap-3">
                     <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-[12px] font-bold shadow-inner">
                       {user.avatar ? (
                         <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                       ) : (
                         <>{user.firstName?.charAt(0)}{user.lastName?.charAt(0)}</>
                       )}
                     </div>
                     <div className="flex-1 min-w-0">
                       <p className="text-[12px] font-bold text-[var(--text-primary)] truncate">{user.firstName} {user.lastName}</p>
                       <p className="text-[10px] text-[var(--text-muted)] truncate">{user.email}</p>
                     </div>
                   </div>
                )}
                <button onClick={() => { navigateTo("/dashboard/settings"); setIsDropdownOpen(false); }}
                  className="w-full text-left px-3 py-2 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] transition-colors flex items-center gap-2.5">
                  <i className="pi pi-cog text-[13px] text-[var(--text-muted)]" />
                  Settings
                </button>
                {isCollapsed && (
                  <button onClick={toggleTheme}
                    className="w-full text-left px-3 py-2 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] transition-colors flex items-center gap-2.5">
                    <i className={`${isDarkMode ? "pi pi-sun" : "pi pi-moon"} text-[13px] text-[var(--text-muted)]`} />
                    {isDarkMode ? "Light Mode" : "Dark Mode"}
                  </button>
                )}
                <button onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-[12px] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex items-center gap-2.5">
                  <i className="pi pi-sign-out text-[13px]" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  /* ── Return ── */
  return (
    <>
      {/* ── Mobile Header ── */}
      <div className="md:hidden h-[52px] bg-[var(--sidebar-bg)] border-b border-[var(--border-subtle)] flex items-center justify-between px-4 flex-shrink-0 shadow-sm">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-1.5 rounded-lg hover:bg-[var(--nav-hover-bg)] text-[var(--text-secondary)] transition-colors"
          title="Menu"
        >
          <i className="pi pi-bars text-[16px]" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[9px] font-bold">
            {user?.firstName?.charAt(0) || "W"}
          </div>
          <span className="text-[13px] font-semibold text-[var(--text-primary)] truncate max-w-[140px]">
            {user ? `${user.firstName}'s Workspace` : "Workspace"}
          </span>
        </div>
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg hover:bg-[var(--nav-hover-bg)] text-[var(--text-muted)] transition-colors"
        >
          <i className={`${isDarkMode ? "pi pi-sun" : "pi pi-moon"} text-[14px]`} />
        </button>
      </div>

      {/* ── Mobile Overlay ── */}
      {isMobileSidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 top-[52px] backdrop-blur-sm"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* ── Mobile Sidebar ── */}
      <div className={`md:hidden fixed left-0 top-[52px] h-[calc(100vh-52px)] w-[260px] bg-[var(--sidebar-bg)] border-r border-[var(--border-subtle)] shadow-2xl transform transition-transform duration-300 z-50 overflow-hidden
        ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <SidebarContent onClose={() => setIsMobileSidebarOpen(false)} />
      </div>

      {/* ── Desktop Sidebar ── */}
      <aside
        className={`hidden md:flex flex-col h-full bg-[var(--sidebar-bg)] border-r border-[var(--border-subtle)] transition-all duration-300 ease-in-out relative
          ${isCollapsed ? "w-[72px]" : "w-[260px]"}
        `}
      >
        <SidebarContent isCollapsed={isCollapsed} />
        
        {/* Collapse Toggle Button - Floating at edge */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-20 w-6 h-6 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-full flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] shadow-md z-50 transition-all hover:scale-110 active:scale-95"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <i className={`pi ${isCollapsed ? "pi-chevron-right" : "pi-chevron-left"} text-[10px]`} />
        </button>
      </aside>

      {/* Global Tooltip for Collapsed Sidebar */}
      {isMounted && isCollapsed && (
        <Tooltip target=".nav-item-tooltip" position="right" className="text-[12px]" />
      )}

      {/* ── Create Channel Modal ── */}
      {isChannelModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setIsChannelModalOpen(false)}>
          <div className="w-full max-w-[480px] mx-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}>
            <div className="relative pt-6 px-6 pb-3 border-b border-[var(--border-subtle)]">
              <button onClick={() => setIsChannelModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[var(--nav-hover-bg)] text-[var(--text-muted)] transition-colors">
                <i className="pi pi-times text-[13px]" />
              </button>
              <h2 className="text-[17px] font-bold text-[var(--text-primary)]">Create Channel</h2>
              <p className="text-[12px] text-[var(--text-secondary)] mt-1">Chat channels are where conversations happen.</p>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div>
                <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5">Name <span className="text-red-500">*</span></label>
                <input autoFocus type="text" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateChannel(); if (e.key === "Escape") setIsChannelModalOpen(false); }}
                  placeholder="e.g. Ideas"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20 transition-all" />
              </div>
              <div>
                <h3 className="text-[12px] font-semibold text-[var(--text-secondary)] mb-2">Privacy</h3>
                <div className="flex items-center gap-4">
                  {["public", "private"].map((type) => (
                    <label key={type} className="inline-flex items-center gap-2 text-[13px] text-[var(--text-secondary)] cursor-pointer">
                      <input type="radio" name="channelPrivacy" checked={newChannelPrivacy === type}
                        onChange={() => setNewChannelPrivacy(type as "public" | "private")}
                        className="accent-[var(--accent)]" />
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              {newChannelPrivacy === "private" && (
                <div className="space-y-3">
                  <h3 className="text-[12px] font-semibold text-[var(--text-secondary)]">Invite Members</h3>
                  <input type="text" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)}
                    placeholder="Search by name or email"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent)] transition-all" />
                  <div className="max-h-40 overflow-y-auto border border-[var(--border-subtle)] rounded-lg divide-y divide-[var(--border-subtle)]">
                    {usersLoading ? <div className="px-3 py-2 text-[12px] text-[var(--text-muted)]">Loading users...</div>
                      : allUsers.filter((u) => `${u.firstName} ${u.lastName} ${u.email || ""}`.toLowerCase().includes(memberSearch.toLowerCase())).map((u) => {
                        const checked = selectedMembers.some((m) => m._id === u._id);
                        return (
                          <label key={u._id} className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer hover:bg-[var(--nav-hover-bg)]">
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{u.firstName} {u.lastName}</p>
                              {u.email && <p className="text-[11px] text-[var(--text-muted)] truncate">{u.email}</p>}
                            </div>
                            <input type="checkbox" checked={checked} onChange={() => toggleMember(u)} className="accent-[var(--accent)]" />
                          </label>
                        );
                      })}
                  </div>
                  {selectedMembers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedMembers.map((m) => (
                        <span key={m._id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[11px] text-[var(--accent)]">
                          {m.firstName}
                          <button onClick={() => toggleMember(m)} className="hover:text-red-500"><i className="pi pi-times text-[9px]" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end px-6 py-4 border-t border-[var(--border-subtle)]">
              <button onClick={handleCreateChannel} disabled={!newChannelName.trim()}
                className="px-5 py-2 rounded-lg text-[13px] font-semibold bg-[var(--nav-active-bg)] hover:opacity-90 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Team Modal ── */}
      {isTeamModalOpen && isAdmin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={closeTeamModal}>
          <div className="w-full max-w-[500px] mx-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden animate-fade-in"
            onClick={(e) => e.stopPropagation()}>
            <div className="relative pt-6 px-6 pb-3 border-b border-[var(--border-subtle)]">
              <button onClick={closeTeamModal} className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[var(--nav-hover-bg)] text-[var(--text-muted)] transition-colors">
                <i className="pi pi-times text-[13px]" />
              </button>
              <h2 className="text-[17px] font-bold text-[var(--text-primary)]">Create Team</h2>
              <p className="text-[12px] text-[var(--text-secondary)] mt-1">Create a team and optionally invite members for private collaboration.</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              {teamCreateError && <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-[12px] text-red-500">{teamCreateError}</div>}
              <div>
                <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5">Team Name</label>
                <input autoFocus value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="e.g. Product Team"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-all" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5">Description</label>
                <input value={newTeamDesc} onChange={(e) => setNewTeamDesc(e.target.value)} placeholder="Optional"
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] transition-all" />
              </div>
              <label className="inline-flex items-center gap-2 text-[13px] text-[var(--text-secondary)] cursor-pointer">
                <input type="checkbox" checked={newTeamPrivate} onChange={(e) => setNewTeamPrivate(e.target.checked)} className="accent-[var(--accent)]" />
                Private team
              </label>
              {newTeamPrivate && (
                <div>
                  <label className="block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5">Invite Members</label>
                  <input value={teamMemberSearch} onChange={(e) => setTeamMemberSearch(e.target.value)} placeholder="Search users"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[13px] text-[var(--text-primary)] outline-none focus:border-[var(--accent)] mb-2 transition-all" />
                  <div className="max-h-40 overflow-y-auto border border-[var(--border-subtle)] rounded-lg divide-y divide-[var(--border-subtle)]">
                    {teamUsersLoading ? <div className="px-3 py-2 text-[12px] text-[var(--text-muted)]">Loading users...</div>
                      : teamUsers.filter((u: any) => `${u.fullName} ${u.email}`.toLowerCase().includes(teamMemberSearch.trim().toLowerCase()))
                        .map((u: any) => (
                          <label key={u._id} className="flex items-center justify-between gap-2 px-3 py-2 text-[12px] text-[var(--text-primary)] hover:bg-[var(--nav-hover-bg)] cursor-pointer">
                            <div className="min-w-0">
                              <p className="truncate">{u.fullName}</p>
                              <p className="truncate text-[11px] text-[var(--text-muted)]">{u.email}</p>
                            </div>
                            <input type="checkbox" checked={selectedTeamMemberIds.includes(u._id)} onChange={() => toggleTeamMember(u._id)} className="accent-[var(--accent)]" />
                          </label>
                        ))}
                  </div>
                  <p className="mt-2 text-[11px] text-[var(--text-muted)]">{selectedTeamMemberIds.length} selected</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-[var(--border-subtle)] flex items-center justify-end gap-2">
              <button onClick={closeTeamModal} className="px-4 py-2 rounded-lg text-[13px] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--nav-hover-bg)] transition-all">Cancel</button>
              <button onClick={handleCreateTeam} disabled={isTeamCreating}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-[var(--nav-active-bg)] text-white hover:opacity-90 disabled:opacity-50 transition-all">
                {isTeamCreating ? "Creating..." : "Create Team"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Change Password Modal ── */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md mx-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[17px] font-bold text-[var(--text-primary)]">Change Password</h2>
              <button onClick={closePasswordModal} className="p-1.5 rounded-full hover:bg-[var(--nav-hover-bg)] text-[var(--text-muted)] transition-colors">
                <i className="pi pi-times text-[13px]" />
              </button>
            </div>
            {passwordError && <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-[12px] text-red-500">{passwordError}</div>}
            {passwordSuccess && <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-[12px] text-green-600">{passwordSuccess}</div>}
            <form onSubmit={handlePasswordSubmit} className="space-y-3">
              <input type="password" name="currentPassword" placeholder="Current Password" value={passwordForm.currentPassword}
                onChange={handlePasswordFormChange} required disabled={isPasswordLoading} className="ck-input w-full" />
              <input type="password" name="newPassword" placeholder="New Password (min 6 characters)" value={passwordForm.newPassword}
                onChange={handlePasswordFormChange} required disabled={isPasswordLoading} className="ck-input w-full" />
              <input type="password" name="confirmPassword" placeholder="Confirm New Password" value={passwordForm.confirmPassword}
                onChange={handlePasswordFormChange} required disabled={isPasswordLoading} className="ck-input w-full" />
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
