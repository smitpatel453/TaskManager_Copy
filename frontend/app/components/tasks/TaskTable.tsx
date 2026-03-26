// components/tasks/TaskTable.tsx
"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "../../../src/api/tasks.api";
import { projectsApi } from "../../../src/api/projects.api";

export type TaskDetail = {
  text: string;
  time?: string;
};

export type Task = {
  _id: string;
  taskName: string;
  hours: number;
  createdAt?: string;
  detailsCount?: number;
  no?: number;
  status?: "to-do" | "in-progress" | "completed";
  projectName?: string;
  projectId?: string;
  assignedTo?: string;
  assignedToName?: string;
  startDate?: string;
  dueDate?: string;
};

type TaskDetailApiItem = {
  text?: string;
  time?: string;
};

const csvEscape = (value: unknown) => {
  const stringValue = value == null ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
};

const toDateCell = (value?: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
};

const toFileDate = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

type TaskTableProps = {
  initialFilter?: string;
  projectFilter?: string;
  assignedToFilter?: string;
  readOnly?: boolean;
  viewMode?: "list" | "board";
};

type CurrentUserProfile = {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  name?: string;
};

const groupOrder: Array<"in-progress" | "to-do" | "completed"> = ["in-progress", "to-do", "completed"];

const groupConfigs = {
  "in-progress": { label: "IN PROGRESS", bgColor: "bg-[#0088FF]", textColor: "text-white" },
  "to-do": { label: "TO DO", bgColor: "bg-[#d3d3d3]", textColor: "text-gray-700" },
  completed: { label: "COMPLETED", bgColor: "bg-[#00b884]", textColor: "text-white" },
};

export default function TaskTable({ initialFilter, projectFilter, assignedToFilter, readOnly = false, viewMode = "list" }: TaskTableProps) {
  const queryClient = useQueryClient();
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<"to-do" | "in-progress" | "completed" | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [isDownloadingWorklog, setIsDownloadingWorklog] = useState(false);
  const [worklogError, setWorklogError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  // Determine API filter from props
  const apiFilter = initialFilter === "assigned" ? "assigned" : initialFilter === "created" ? "created" : "all";

  // Status filter for client-side filtering
  const [statusFilter, setStatusFilter] = useState<"all" | "to-do" | "in-progress" | "completed">("all");
  const [groupByStatus, setGroupByStatus] = useState(true);
  const [statusProjectFilter, setStatusProjectFilter] = useState<string>("all");

  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    "in-progress": false,
    "to-do": false,
    completed: true,
  });

  // Inline add task state
  const [addingInGroup, setAddingInGroup] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [newTaskProject, setNewTaskProject] = useState(projectFilter || "");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskStatus, setNewTaskStatus] = useState<"to-do" | "in-progress" | "completed">("to-do");
  const [newTaskPriority, setNewTaskPriority] = useState<"low" | "normal" | "high" | "urgent" | undefined>();
  const [isCreating, setIsCreating] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const newTaskInputRef = useRef<HTMLInputElement>(null);

  // Custom dropdown states
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const [assigneeDropdownOpen, setAssigneeDropdownOpen] = useState(false);
  const [statusDropdownOpenInline, setStatusDropdownOpenInline] = useState(false);
  const [priorityDropdownOpenInline, setPriorityDropdownOpenInline] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);
  const assigneeDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRefInline = useRef<HTMLDivElement>(null);
  const priorityDropdownRefInline = useRef<HTMLDivElement>(null);
  const projectDropdownRefInline = useRef<HTMLDivElement>(null);

  // Fetch tasks
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tasks", currentPage, itemsPerPage, apiFilter],
    queryFn: () => tasksApi.getTasks(currentPage, itemsPerPage, apiFilter),
    staleTime: 5 * 60 * 1000,
  });

  // Calculate filtered tasks for correct pagination display
  const filteredTasks = useMemo(() => {
    let filtered = data?.data || [];
    if (projectFilter) {
      filtered = filtered.filter(t => t.projectId === projectFilter);
    }
    if (assignedToFilter) {
      filtered = filtered.filter(t => t.assignedTo === assignedToFilter);
    }
    return filtered;
  }, [data?.data, projectFilter, assignedToFilter]);

  const hasClientFilter = Boolean(projectFilter || assignedToFilter);
  const displayTotal = hasClientFilter ? filteredTasks.length : (data?.pagination?.totalItems || 0);

  // Click outside handler for custom dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) setProjectDropdownOpen(false);
      if (assigneeDropdownRef.current && !assigneeDropdownRef.current.contains(e.target as Node)) setAssigneeDropdownOpen(false);
      if (statusDropdownRefInline.current && !statusDropdownRefInline.current.contains(e.target as Node)) setStatusDropdownOpenInline(false);
      if (priorityDropdownRefInline.current && !priorityDropdownRefInline.current.contains(e.target as Node)) setPriorityDropdownOpenInline(false);
      if (projectDropdownRefInline.current && !projectDropdownRefInline.current.contains(e.target as Node)) setProjectDropdownOpenInline(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Fetch projects for dropdowns
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<CurrentUserProfile | null>(null);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsAdmin(user.role === "admin");
        setCurrentUserId(user.id || user._id);
        setCurrentUserProfile({
          firstName: user.firstName,
          lastName: user.lastName,
          fullName: user.fullName,
          name: user.name,
        });
      } catch { /* ignore */ }
    }
  }, []);

  const { data: projectsData } = useQuery({
    queryKey: ["projects", isAdmin ? "admin" : "user"],
    queryFn: isAdmin ? projectsApi.getAllProjects : projectsApi.getMyProjects,
    enabled: addingInGroup !== null || (isAdmin && groupByStatus),
    staleTime: 5 * 60 * 1000,
  });
  const projects = projectsData?.data || [];

  const { data: usersData } = useQuery({
    queryKey: ["users-dropdown", isAdmin],
    queryFn: projectsApi.getAllUsersForDropdown,
    enabled: isAdmin && addingInGroup !== null,
    staleTime: 5 * 60 * 1000,
  });
  const users = usersData?.data || [];

  // Filter users based on selected project
  const availableUsers = useMemo(() => {
    if (!newTaskProject) return users;

    // Find selected project
    const selectedProject = projects.find(p => p._id === newTaskProject);

    // If project not found or has no assigned users, return empty list (or all users if desired behavior)
    // Based on requirement: "assigned users are only those shown which are assigned only to that selected project"
    // I check if project exists and has assigned users.
    if (selectedProject && selectedProject.assignedUsers && selectedProject.assignedUsers.length > 0) {
      return selectedProject.assignedUsers.map(u => ({
        _id: u._id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        fullName: `${u.firstName} ${u.lastName}`
      }));
    }

    // If project exists but no assigned users, return empty list strict filter
    if (selectedProject) return [];

    return users;
  }, [users, projects, newTaskProject]);

  let items: Task[] = data?.data || [];

  // Client-side project filter
  if (projectFilter) {
    items = items.filter((t) => t.projectId === projectFilter);
  }

  // Admin-only project filter for workload-by-status
  if (groupByStatus && isAdmin && statusProjectFilter !== "all") {
    items = items.filter((t) => t.projectId === statusProjectFilter);
  }

  // Client-side status filter
  if (statusFilter !== "all") {
    items = items.filter((t) => (t.status || "to-do") === statusFilter);
  }

  // Client-side assigned user filter
  if (assignedToFilter) {
    items = items.filter((t) => t.assignedTo === assignedToFilter);
  }

  const pagination = data?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  const displayedCount = items.length;
  const shownStart = hasClientFilter
    ? (displayedCount > 0 ? 1 : 0)
    : (displayTotal > 0 ? (pagination.currentPage - 1) * pagination.itemsPerPage + 1 : 0);
  const shownEnd = hasClientFilter
    ? displayedCount
    : Math.min(pagination.currentPage * pagination.itemsPerPage, displayTotal);

  // Group tasks by status
  const groupedTasks = useMemo(() => {
    const map: Record<string, Task[]> = {
      "in-progress": [],
      "to-do": [],
      completed: [],
    };
    for (const t of items) {
      const key = t.status || "to-do";
      if (map[key]) map[key].push(t);
    }
    return map;
  }, [items]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePrevious = () => {
    if (pagination.hasPreviousPage) setCurrentPage((p) => p - 1);
  };

  const handleNext = () => {
    if (pagination.hasNextPage) setCurrentPage((p) => p + 1);
  };

  const handleTaskDragStart = (e: React.DragEvent<HTMLDivElement>, task: Task) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", task._id);
    setDraggingTaskId(task._id);
  };

  const handleTaskDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverStatus(null);
  };

  const handleStatusDragOver = (e: React.DragEvent<HTMLDivElement>, status: "to-do" | "in-progress" | "completed") => {
    e.preventDefault();
    if (!draggingTaskId) return;
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  };

  const handleStatusDrop = async (e: React.DragEvent<HTMLDivElement>, status: "to-do" | "in-progress" | "completed") => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain") || draggingTaskId;

    setDragOverStatus(null);

    if (!taskId) return;
    const task = items.find((candidate) => candidate._id === taskId);
    if (!task) return;
    if ((task.status || "to-do") === status) return;

    setUpdatingTaskId(taskId);
    try {
      await tasksApi.updateTaskStatus(taskId, status);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    } catch (error) {
      console.error("Failed to update task status from board drag and drop:", error);
    } finally {
      setUpdatingTaskId(null);
      setDraggingTaskId(null);
    }
  };

  const downloadCompletedWorklog = async () => {
    setIsDownloadingWorklog(true);
    setWorklogError(null);

    try {
      const allTasks: Task[] = [];
      let page = 1;
      const perPage = 100;
      let hasNextPage = true;

      while (hasNextPage) {
        const response = await tasksApi.getTasks(page, perPage, apiFilter);
        allTasks.push(...(response.data || []));
        hasNextPage = Boolean(response.pagination?.hasNextPage);
        page += 1;
      }

      let filteredForWorklog = allTasks;

      if (projectFilter) {
        filteredForWorklog = filteredForWorklog.filter((task) => task.projectId === projectFilter);
      }

      if (assignedToFilter) {
        filteredForWorklog = filteredForWorklog.filter((task) => task.assignedTo === assignedToFilter);
      }

      if (groupByStatus && isAdmin && statusProjectFilter !== "all") {
        filteredForWorklog = filteredForWorklog.filter((task) => task.projectId === statusProjectFilter);
      }

      const completedTasks = filteredForWorklog.filter((task) => (task.status || "to-do") === "completed");

      if (completedTasks.length === 0) {
        setWorklogError("No completed tasks found for the current filters.");
        return;
      }

      const detailedTasks = await Promise.all(
        completedTasks.map(async (task) => {
          try {
            const detailsResponse = await tasksApi.getTaskDetails(task._id);
            const details = Array.isArray(detailsResponse?.details) ? detailsResponse.details : [];
            return { task, details };
          } catch {
            return { task, details: [] as TaskDetailApiItem[] };
          }
        })
      );

      const header = [
        "Task Name",
        "Project",
        "Assigned To",
        "Hours",
        "Status",
        "Start Date",
        "Due Date",
        "Created At",
        "Detail",
        "Detail Time",
      ];

      const rows: string[] = [header.map(csvEscape).join(",")];

      for (const { task, details } of detailedTasks) {
        const baseColumns = [
          task.taskName,
          task.projectName || "",
          task.assignedToName || "",
          task.hours,
          task.status || "to-do",
          toDateCell(task.startDate),
          toDateCell(task.dueDate),
          toDateCell(task.createdAt),
        ];

        if (!details.length) {
          rows.push([...baseColumns, "", ""].map(csvEscape).join(","));
          continue;
        }

        for (const detail of details) {
          rows.push([...baseColumns, detail?.text || "", detail?.time || ""].map(csvEscape).join(","));
        }
      }

      const csvContent = rows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `completed-worklog-${toFileDate()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch {
      setWorklogError("Failed to generate worklog. Please try again.");
    } finally {
      setIsDownloadingWorklog(false);
    }
  };

  const formatDueDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diff = Math.floor((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff === -1) return "Yesterday";
    if (diff < -1) return `${Math.abs(diff)} days ago`;
    if (diff <= 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const isDueDateOverdue = (dateString?: string) => {
    if (!dateString) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateString);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  // Start inline add
  const [newTaskHoursInput, setNewTaskHoursInput] = useState<string>("");
  const [newTaskMinutesInput, setNewTaskMinutesInput] = useState<string>("");
  const [subtasks, setSubtasks] = useState<Array<{ text: string; hours: number; minutes: number }>>([]);
  const [currentSubtaskText, setCurrentSubtaskText] = useState("");
  const [currentSubtaskHours, setCurrentSubtaskHours] = useState<string>("");
  const [currentSubtaskMinutes, setCurrentSubtaskMinutes] = useState<string>("");

  const startInlineAdd = (groupKey: string) => {
    setAddingInGroup(groupKey);
    setNewTaskName("");
    setNewTaskProject(projectFilter || "");
    setNewTaskAssignee(isAdmin ? "" : currentUserId || "");
    setNewTaskDueDate("");
    setNewTaskStatus(groupKey as "to-do" | "in-progress" | "completed");
    setNewTaskPriority(undefined);
    setNewTaskHoursInput("");
    setNewTaskMinutesInput("");
    setSubtasks([]);
    setCurrentSubtaskText("");
    setCurrentSubtaskHours("");
    setCurrentSubtaskMinutes("");
    setSubmissionError(null);
    setProjectDropdownOpen(false);
    setAssigneeDropdownOpen(false);
    setStatusDropdownOpenInline(false);
    setTimeout(() => newTaskInputRef.current?.focus(), 50);
  };

  // Cycle to next status
  const cycleNextStatus = () => {
    const cycle: Record<string, "to-do" | "in-progress" | "completed"> = {
      "to-do": "in-progress",
      "in-progress": "completed",
      "completed": "to-do",
    };
    setNewTaskStatus(cycle[newTaskStatus]);
  };

  // Get status color for inline badge
  const getInlineStatusColor = (s: string) => {
    switch (s) {
      case "completed": return "#00b884";
      case "in-progress": return "#0088FF";
      default: return "#a0a0a0";
    }
  };

  const getInlineStatusLabel = (s: string) => {
    switch (s) {
      case "completed": return "COMPLETE";
      case "in-progress": return "IN PROGRESS";
      default: return "TO DO";
    }
  };

  // Selected project name
  const selectedProjectName = projects.find(p => p._id === newTaskProject)?.projectName;
  // Selected assignee name - ensure type safety
  const selectedAssignee = useMemo(() => {
    if (!newTaskAssignee) return undefined;
    const assignee = users.find(u => String(u._id) === String(newTaskAssignee));
    if (assignee) return assignee;
    // For non-admins when users query is disabled, use current user
    if (!isAdmin && users.length === 0 && newTaskAssignee === currentUserId) {
      const firstName = currentUserProfile?.firstName || currentUserProfile?.name || "You";
      const lastName = currentUserProfile?.lastName || "";
      return {
        _id: currentUserId,
        firstName,
        lastName,
        fullName: currentUserProfile?.fullName || `${firstName} ${lastName}`.trim(),
      };
    }
    return undefined;
  }, [users, newTaskAssignee, currentUserId, isAdmin, currentUserProfile]);

  // Helper to format hours:minutes to "HH:MM"
  const toHHMM = (h: number, m: number) => {
    const totalMinutes = Math.max(0, Math.floor(h) * 60 + Math.floor(m));
    const hh = Math.floor(totalMinutes / 60);
    const mm = totalMinutes % 60;
    return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  };

  // Helper to parse "HH:MM" to { hours, minutes }
  const parseTime = (timeStr: string) => {
    const [h, m] = timeStr.split(":").map(Number);
    return { hours: h || 0, minutes: m || 0 };
  };

  const currentSubtaskTotalMinutes = useMemo(() => {
    const h = parseInt(currentSubtaskHours || "0", 10);
    const m = parseInt(currentSubtaskMinutes || "0", 10);
    return h * 60 + m;
  }, [currentSubtaskHours, currentSubtaskMinutes]);

  const isSubtaskOverAdminLimit = isAdmin && currentSubtaskTotalMinutes > 120;

  const addSubtask = () => {
    const h = parseInt(currentSubtaskHours || "0", 10);
    const m = parseInt(currentSubtaskMinutes || "0", 10);
    if (isAdmin && h * 60 + m > 120) {
      setSubmissionError("Admins cannot add subtasks longer than 2 hours.");
      return;
    }
    if (!currentSubtaskText.trim() || (h === 0 && m === 0)) return;

    setSubmissionError(null);
    setSubtasks([...subtasks, { text: currentSubtaskText, hours: h, minutes: m }]);
    setCurrentSubtaskText("");
    setCurrentSubtaskHours("");
    setCurrentSubtaskMinutes("");
  };

  const removeSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const totalSubtaskHours = useMemo(() => {
    const totalMinutes = subtasks.reduce((acc, curr) => acc + curr.hours * 60 + curr.minutes, 0);
    return totalMinutes / 60;
  }, [subtasks]);

  const totalEstHours = useMemo(() => {
    const h = parseInt(newTaskHoursInput || "0", 10);
    const m = parseInt(newTaskMinutesInput || "0", 10);
    return h + m / 60;
  }, [newTaskHoursInput, newTaskMinutesInput]);

  const validationError = useMemo(() => {
    if (!newTaskName.trim()) return "Task name is required";
    if (isAdmin && !newTaskAssignee) return "Please select a user to assign the task";
    if (!newTaskDueDate) return "Due date is required";
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDateValue = new Date(`${newTaskDueDate}T00:00:00`);
    if (Number.isNaN(dueDateValue.getTime())) return "Due date is invalid";
    if (dueDateValue <= today) return "Due date must be after today";
    if (totalEstHours <= 0) return "Total time must be greater than 0";
    if (subtasks.length === 0) return "At least one subtask is required";

    // Strict equality check for time matching
    if (Math.abs(totalSubtaskHours - totalEstHours) > 0.01) {
      return `Total subtask time (${totalSubtaskHours.toFixed(2)}h) must match estimated time (${totalEstHours.toFixed(2)}h)`;
    }

    if (totalEstHours >= 4 && subtasks.length < 3) {
      return "For tasks >= 4 hours, at least 3 subtasks are required";
    }
    if (totalEstHours >= 3 && totalEstHours < 4 && subtasks.length < 2) {
      return "For tasks between 3 and 4 hours, at least 2 subtasks are required";
    }

    return null;
  }, [newTaskName, newTaskDueDate, totalEstHours, subtasks, totalSubtaskHours, isAdmin, newTaskAssignee]);

  // Support tags input in state
  const [newTaskTagsInput, setNewTaskTagsInput] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [projectDropdownOpenInline, setProjectDropdownOpenInline] = useState(false);

  // Submit inline task
  const submitInlineTask = async () => {
    if (!newTaskName.trim()) {
      setSubmissionError("Task name is required");
      return;
    }

    if (viewMode === "list" && validationError) {
      setSubmissionError(validationError);
      return;
    }

    setSubmissionError(null);
    setIsCreating(true);
    try {
      const taskData = {
        taskName: newTaskName.trim(),
        description: viewMode === "board" ? newTaskDescription.trim() : undefined,
        hours: viewMode === "list" ? totalEstHours : 0,
        details: viewMode === "list" && subtasks
          ? subtasks.map(st => {
            const h = st.hours?.toString().padStart(2, '0') || '00';
            const m = st.minutes?.toString().padStart(2, '0') || '00';
            return { text: st.text, time: `${h}:${m}` };
          })
          : [],
        status: newTaskStatus,
        priority: newTaskPriority,
        tags: newTaskTagsInput ? newTaskTagsInput.split(',').map(t => t.trim()).filter(Boolean) : [],
        projectId: newTaskProject || undefined,
        assignedTo: newTaskAssignee || undefined,
        dueDate: newTaskDueDate || undefined,
        startDate: new Date().toISOString(),
      };

      console.log("Submitting task data:", taskData);

      await tasksApi.createTask(taskData as any);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });

      // Reset form
      setNewTaskName("");
      setNewTaskProject(projectFilter || "");
      setNewTaskAssignee("");
      setNewTaskDueDate("");
      setNewTaskTagsInput("");
      setNewTaskDescription("");
      setNewTaskStatus(addingInGroup as "to-do" | "in-progress" | "completed");
      setNewTaskPriority(undefined);
      setSubtasks([]);
      setCurrentSubtaskText("");
      setCurrentSubtaskHours("");
      setCurrentSubtaskMinutes("");
      setAddingInGroup(null);
      // Don't focus on unmounted input - form is being closed
    } catch (error) {
      let errorMsg = "Failed to create task";
      if (error && typeof error === 'object') {
        const err = error as any;
        if (err.response?.data?.error) {
          errorMsg = err.response.data.error;
        } else if (err.message) {
          errorMsg = err.message;
        }
      }
      setSubmissionError(errorMsg);
      console.error("Failed to create task:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleInlineKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitInlineTask();
    } else if (e.key === "Escape") {
      setAddingInGroup(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-[var(--text-tertiary)]">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">Loading tasks...</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-[var(--status-error)]">Failed to load tasks. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* List Toolbar */}
      <div className="flex items-center justify-between mb-4 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGroupByStatus((prev) => !prev)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors ${groupByStatus
              ? "border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
              : "border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]"}`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" />
            </svg>
            Group: Status
          </button>
          {isAdmin && groupByStatus && (
            <select
              value={statusProjectFilter}
              onChange={(e) => { setStatusProjectFilter(e.target.value); setCurrentPage(1); }}
              className="flex items-center gap-1.5 border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] px-2 py-1 rounded-md text-xs hover:bg-[var(--bg-surface)] shadow-sm outline-none"
            >
              <option value="all">All Projects</option>
              {projects.map((project) => (
                <option key={project._id} value={project._id}>{project.projectName}</option>
              ))}
            </select>
          )}
          {!readOnly && (
            <button
              onClick={() => startInlineAdd("to-do")}
              className="flex items-center gap-1.5 border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] px-2.5 py-1 rounded-md hover:bg-[var(--bg-surface)] transition-colors shadow-sm font-medium"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Task
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={downloadCompletedWorklog}
            disabled={isDownloadingWorklog || isLoading}
            className="flex items-center gap-1.5 border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] px-2.5 py-1 rounded-md hover:bg-[var(--bg-surface)] transition-colors shadow-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            title="Download completed tasks worklog"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {isDownloadingWorklog ? "Preparing..." : "Download Worklog"}
          </button>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setCurrentPage(1); }}
            className="flex items-center gap-1.5 border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] px-2 py-1 rounded-md text-xs hover:bg-[var(--bg-surface)] shadow-sm outline-none"
          >
            <option value="all">All Tasks</option>
            <option value="to-do">To Do</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {worklogError && (
        <div className="mb-3 text-xs text-[var(--status-error)]">
          {worklogError}
        </div>
      )}

      {/* Tasks Display */}
      {viewMode === "board" ? (
        <div className="flex gap-4 overflow-x-auto pb-4 items-start min-h-[500px] ck-scrollbar snap-x">
          {groupOrder.map((key) => {
            const groupItems = groupedTasks[key] || [];
            const config = groupConfigs[key];

            return (
              <div
                key={key}
                onDragOver={(e) => handleStatusDragOver(e, key)}
                onDrop={(e) => handleStatusDrop(e, key)}
                onDragLeave={() => {
                  if (dragOverStatus === key) {
                    setDragOverStatus(null);
                  }
                }}
                className={`flex-none w-[320px] bg-[var(--bg-surface-2)] border rounded-xl flex flex-col max-h-[calc(100vh-220px)] shadow-sm snap-start transition-colors ${dragOverStatus === key ? "border-[var(--accent)]" : "border-[var(--border-subtle)]"}`}
              >
                <div className="px-3 py-3 flex items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider ${config.bgColor} ${config.textColor}`}>
                      {config.label}
                    </div>
                    <span className="text-[12px] text-[var(--text-muted)] font-medium">{groupItems.length}</span>
                  </div>
                  {!readOnly && (
                    <div className="flex items-center gap-1">
                      <button className="p-1 hover:bg-[var(--bg-surface)] rounded text-[var(--text-muted)]"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg></button>
                      <button onClick={() => startInlineAdd(key)} className="p-1 hover:bg-[var(--bg-surface)] rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg></button>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-2 ck-scrollbar">
                  {addingInGroup === key && (
                    <div className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg shadow-sm border-[var(--ck-blue)] ring-1 ring-[#e4e4e7] dark:ring-[#3f3f46]">
                      <div className="flex items-center gap-2 p-2.5 border-b border-[var(--border-subtle)]">
                        <input
                          ref={newTaskInputRef}
                          type="text"
                          value={newTaskName}
                          onChange={(e) => setNewTaskName(e.target.value)}
                          onKeyDown={handleInlineKeyDown}
                          placeholder="Task Name..."
                          disabled={isCreating}
                          className="flex-1 min-w-0 bg-transparent outline-none text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)]"
                        />
                        <button onClick={submitInlineTask} disabled={isCreating} className="flex-shrink-0 bg-[#eaeaeb] dark:bg-[#343438] hover:bg-[#d6d6d8] dark:hover:bg-[#404044] text-[var(--text-secondary)] px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors flex items-center gap-1.5">
                          {isCreating ? "Saving..." : "Save"}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 10l-5 5 5 5" /><path d="M20 4v7a4 4 0 0 1-4 4H4" /></svg>
                        </button>
                      </div>

                      <div className="px-2 pt-1.5 pb-1 border-b border-[var(--border-subtle)]">
                        <input
                          type="text"
                          value={newTaskDescription}
                          onChange={(e) => setNewTaskDescription(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              submitInlineTask();
                            }
                          }}
                          placeholder="Add subtask description (optional)"
                          className="w-full bg-transparent border-none outline-none text-[12px] text-[var(--text-secondary)] placeholder-[var(--text-muted)]"
                        />
                      </div>

                      <div className="p-1.5 space-y-0.5">
                        {/* Assignee */}
                        <div className="relative" ref={assigneeDropdownRef}>
                          <button onClick={(e) => { e.stopPropagation(); setAssigneeDropdownOpen(!assigneeDropdownOpen); setPriorityDropdownOpenInline(false); }} className="w-full flex items-center gap-3 px-2.5 py-2 hover:bg-[var(--bg-surface)] text-[12px] text-[var(--text-secondary)] rounded-md transition-colors text-left group">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            {newTaskAssignee ? <span className="text-[var(--text-primary)]">{newTaskAssignee === currentUserId ? "Me" : availableUsers.find(u => u._id === newTaskAssignee)?.fullName || "Unknown"}</span> : <span>Add assignee</span>}
                          </button>
                          {assigneeDropdownOpen && (
                            <div className="absolute left-0 top-full mt-1 z-50 w-[240px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg shadow-xl max-h-[300px] flex flex-col">
                              <div className="p-2 border-b border-[var(--border-subtle)]">
                                <div className="flex items-center gap-2 bg-[var(--bg-surface-2)] px-2 py-1.5 rounded text-[12px]">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)]"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                  <input type="text" placeholder="Search or enter email..." className="w-full bg-transparent outline-none text-[var(--text-primary)]" />
                                </div>
                              </div>
                              <div className="p-1.5 overflow-y-auto ck-scrollbar">
                                <div className="px-2 py-1 text-[10px] text-[var(--text-muted)] mt-1">People</div>
                                <button onClick={(e) => { e.stopPropagation(); setNewTaskAssignee(currentUserId || ""); setAssigneeDropdownOpen(false); }} className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-[var(--bg-surface)] rounded-md text-[13px] text-[var(--text-primary)]">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-5 h-5 rounded-full bg-gray-600 dark:bg-gray-700 text-white flex justify-center items-center text-[9px] font-bold">Me</div>
                                    <span>Me <span className="text-[var(--text-muted)] ml-1 text-[11px]">(Profile)</span></span>
                                  </div>
                                </button>
                                <div className="w-full h-px bg-[var(--border-subtle)] my-1"></div>
                                {availableUsers.map(u => (
                                  <button key={u._id} onClick={(e) => { e.stopPropagation(); setNewTaskAssignee(u._id); setAssigneeDropdownOpen(false); }} className="w-full flex items-center justify-between px-2 py-1.5 hover:bg-[var(--bg-surface)] rounded-md text-[13px] text-[var(--text-primary)]">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex justify-center items-center text-[9px] font-bold">{u.fullName.charAt(0)}</div>
                                      <span>{u.fullName}</span>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Due Date */}
                        <div className="relative">
                          <div className="w-full flex items-center gap-3 px-2.5 py-2 hover:bg-[var(--bg-surface)] text-[12px] text-[var(--text-secondary)] rounded-md transition-colors text-left group cursor-pointer relative">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] flex-shrink-0"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                            {!newTaskDueDate && <span className="absolute left-[38px] pointer-events-none">Add dates</span>}
                            <input
                              type="date"
                              className={`bg-transparent border-none outline-none w-full cursor-pointer h-[20px] ${!newTaskDueDate ? 'text-transparent' : 'text-[var(--text-primary)] bg-[var(--bg-surface-2)] px-1.5 py-0.5 rounded-md'}`}
                              value={newTaskDueDate}
                              onChange={e => setNewTaskDueDate(e.target.value)}
                              style={{ colorScheme: 'dark' }}
                            />
                          </div>
                        </div>

                        {/* Priority */}
                        <div className="relative" ref={priorityDropdownRefInline}>
                          <button onClick={(e) => { e.stopPropagation(); setPriorityDropdownOpenInline(!priorityDropdownOpenInline); setAssigneeDropdownOpen(false); }} className="w-full flex items-center gap-3 px-2.5 py-2 hover:bg-[var(--bg-surface)] text-[12px] text-[var(--text-secondary)] rounded-md transition-colors text-left group">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
                            {newTaskPriority ? <span className="text-[var(--text-primary)] capitalize">{newTaskPriority}</span> : <span>Add priority</span>}
                          </button>
                          {priorityDropdownOpenInline && (
                            <div className="absolute left-0 top-full mt-1 z-50 w-full min-w-[140px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg shadow-xl p-1.5">
                              {["urgent", "high", "normal", "low"].map(p => (
                                <button key={p} onClick={(e) => { e.stopPropagation(); setNewTaskPriority(p as any); setPriorityDropdownOpenInline(false); }} className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--bg-surface)] rounded-md text-[12px] text-[var(--text-primary)] capitalize">
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill={p === 'urgent' ? "#ef4444" : p === 'high' ? "#f59e0b" : p === 'normal' ? "#3b82f6" : "#8b5cf6"} stroke="none"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /></svg>
                                  {p}
                                </button>
                              ))}
                              <div className="w-full h-px bg-[var(--border-subtle)] my-1"></div>
                              <button onClick={(e) => { e.stopPropagation(); setNewTaskPriority(undefined); setPriorityDropdownOpenInline(false); }} className="w-full text-left px-3 py-1.5 text-[var(--text-muted)] text-[11px] hover:bg-[var(--bg-surface)] hover:text-[var(--text-secondary)] rounded-md">Clear</button>
                            </div>
                          )}
                        </div>

                        {/* Project */}
                        <div className="relative" ref={projectDropdownRefInline}>
                          <button onClick={(e) => { e.stopPropagation(); setProjectDropdownOpenInline(!projectDropdownOpenInline); setAssigneeDropdownOpen(false); setPriorityDropdownOpenInline(false); }} className="w-full flex items-center gap-3 px-2.5 py-2 hover:bg-[var(--bg-surface)] text-[12px] text-[var(--text-secondary)] rounded-md transition-colors text-left group">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>
                            {newTaskProject ? <span className="text-[var(--text-primary)] truncate block max-w-[120px]">{projects.find(p => String(p._id) === String(newTaskProject))?.projectName || "Unknown Project"}</span> : <span>Add project</span>}
                          </button>
                          {projectDropdownOpenInline && (
                            <div className="absolute left-0 top-full mt-1 z-50 w-[240px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg shadow-xl max-h-[300px] overflow-y-auto p-1.5 flex flex-col gap-0.5">
                              {projects.map(p => (
                                <button key={String(p._id)} onClick={(e) => { e.stopPropagation(); setNewTaskProject(String(p._id)); setProjectDropdownOpenInline(false); }} className="flex items-center gap-2.5 px-3 py-2 hover:bg-[var(--bg-surface)] rounded-md text-[12px] text-[var(--text-primary)] text-left">
                                  <div className={`w-2.5 h-2.5 rounded-full bg-blue-500`}></div>
                                  <span className="truncate">{p.projectName}</span>
                                </button>
                              ))}
                              <div className="w-full h-px bg-[var(--border-subtle)] my-1"></div>
                              <button onClick={(e) => { e.stopPropagation(); setNewTaskProject(""); setProjectDropdownOpenInline(false); }} className="w-full text-left px-3 py-1.5 text-[var(--text-muted)] text-[11px] hover:bg-[var(--bg-surface)] hover:text-[var(--text-secondary)] rounded-md">Clear</button>
                            </div>
                          )}
                        </div>

                        {/* Tags */}
                        <div className="relative col-span-2">
                          <div className="w-full flex items-center gap-3 px-2.5 py-2 text-[12px] text-[var(--text-secondary)] rounded-md">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-tertiary)] flex-shrink-0"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>
                            <input
                              type="text"
                              value={newTaskTagsInput}
                              onChange={e => setNewTaskTagsInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  submitInlineTask();
                                }
                              }}
                              placeholder="Add tags (comma separated) and press Enter to save"
                              className="w-full bg-transparent border-none outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)]"
                            />
                          </div>
                        </div>
                      </div>

                      {submissionError && <div className="px-3 pb-2 text-[11px] text-red-500 font-medium">{submissionError}</div>}

                      <div className="bg-[var(--bg-surface-2)] border-t border-[var(--border-subtle)] rounded-b-lg p-1 flex items-center justify-between">
                        <div className="flex gap-1" />
                        <button onClick={() => setAddingInGroup(null)} className="text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] px-2 py-1 mr-1">Cancel</button>
                      </div>
                    </div>
                  )}

                  {groupItems.map(task => (
                    <div
                      key={task._id}
                      draggable
                      onDragStart={(e) => handleTaskDragStart(e, task)}
                      onDragEnd={handleTaskDragEnd}
                      onDoubleClick={() => setExpandedTaskId(expandedTaskId === task._id ? null : task._id)}
                      className={`bg-[var(--bg-canvas)] border border-[var(--border-subtle)] p-3 rounded-lg shadow-sm hover:border-[var(--border-hover)] hover:shadow-md cursor-grab active:cursor-grabbing transition-all group ${draggingTaskId === task._id ? "opacity-60" : "opacity-100"} ${updatingTaskId === task._id ? "pointer-events-none" : ""}`}
                    >
                      <div className="flex items-start gap-2 mb-3">
                        <div className="mt-0.5 flex-shrink-0">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`transition-colors ${task.status === "completed" ? "text-[#00b884]" : "text-[var(--text-muted)] group-hover:text-blue-500"}`}>
                            {task.status === "completed" ? (
                              <>
                                <circle cx="12" cy="12" r="9" />
                                <polyline points="9 12 11 14 15 10" strokeWidth="2" />
                              </>
                            ) : (
                              <circle cx="12" cy="12" r="9" />
                            )}
                          </svg>
                        </div>
                        <div className={`font-medium text-[13px] line-clamp-2 leading-tight flex-1 ${task.status === "completed" ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]"}`}>
                          {task.taskName}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Assignee */}
                          {task.assignedToName ? (
                            <div className="w-5 h-5 rounded-full bg-[var(--bg-surface-3)] text-[var(--text-secondary)] border border-[var(--border-subtle)] flex items-center justify-center text-[10px] font-bold shadow-sm" title={task.assignedToName}>
                              {task.assignedToName.charAt(0).toUpperCase()}
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border border-dashed border-[var(--border-subtle)] bg-[var(--bg-canvas)] flex items-center justify-center text-[var(--text-tertiary)]" title="Unassigned">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            </div>
                          )}

                          {/* Due Date */}
                          {task.dueDate && (
                            <div className={`flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10.5px] font-medium ${isDueDateOverdue(task.dueDate) && task.status !== "completed" ? "text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20" : "text-[var(--text-muted)] bg-[var(--bg-surface-2)]"}`}>
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                              {formatDueDate(task.dueDate)}
                            </div>
                          )}
                        </div>

                        {/* Hours & Priority indicator */}
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-1 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" /><line x1="4" y1="22" x2="4" y2="15" /></svg>
                          </div>
                          <span className="text-[11px] text-[var(--text-tertiary)] font-medium bg-[var(--bg-surface-2)] px-1.5 py-0.5 rounded">
                            {task.hours}h
                          </span>
                        </div>
                      </div>

                      {/* Expanded View for Task details */}
                      {expandedTaskId === task._id && (
                        <div className="mt-3 pt-2 border-t border-[var(--border-subtle)]" onClick={(e) => e.stopPropagation()}>
                          {(task as any).description && (
                            <div className="text-[12px] text-[var(--text-secondary)] whitespace-pre-wrap mb-2">
                              {(task as any).description}
                            </div>
                          )}
                          {(task as any).details && (task as any).details.length > 0 && (
                            <div className="flex flex-col gap-1.5 mt-2">
                              <h4 className="text-[11px] font-bold text-[var(--text-muted)] uppercase">Subtasks</h4>
                              {(task as any).details.map((sub: any, i: number) => (
                                <div key={i} className="flex items-start gap-2 text-[12px] text-[var(--text-secondary)]">
                                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--border-subtle)] mt-1.5 flex-shrink-0" />
                                  <span className="flex-1">{sub.text}</span>
                                  {sub.time && sub.time !== "00:00" && <span className="text-[10px] text-[var(--text-tertiary)]">{sub.time}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {!readOnly && addingInGroup !== key && (
                    <button onClick={() => startInlineAdd(key)} className="w-full text-left py-2 px-2.5 mt-1 text-[12px] font-medium text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] rounded transition-colors flex items-center gap-1.5">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                      Add Task
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-canvas)] shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_120px_140px_140px_120px_130px_40px] gap-2 items-center px-8 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
                <div>Name</div>
                <div>Hours</div>
                <div>Project</div>
                <div>Assigned To</div>
                <div>Status</div>
                <div className="flex items-center gap-1">
                  Due date
                  <svg className="w-3 h-3 text-purple-400 bg-purple-50 rounded-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                </div>
                <div className="flex justify-center" />
              </div>

              {/* Rows */}
              <div className="flex flex-col">
                {items.length === 0 && addingInGroup === null ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <p className="text-[var(--text-tertiary)]">No tasks yet</p>
                  </div>
                ) : groupByStatus ? (
                  groupOrder.map((key) => {
                    const groupItems = groupedTasks[key] || [];
                    if (groupItems.length === 0 && key === "completed" && collapsedGroups[key]) return null;

                    const isCollapsed = collapsedGroups[key];
                    const config = groupConfigs[key];

                    return (
                      <div
                        key={key}
                        className={`flex flex-col ${dragOverStatus === key ? "bg-[var(--bg-surface)]/70" : ""}`}
                      >
                        {/* Group Header */}
                        <div className="flex items-center px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] group hover:bg-[var(--bg-surface)] transition-colors">
                          <button
                            onClick={() => toggleGroup(key)}
                            className="p-1 text-[var(--text-muted)] hover:text-[var(--text-secondary)] rounded"
                          >
                            <svg
                              className={`w-4 h-4 transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`}
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>

                          <div className={`ml-2 px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider ${config.bgColor} ${config.textColor}`}>
                            {config.label}
                          </div>
                          <span className="ml-3 text-[13px] text-[var(--text-muted)]">{groupItems.length}</span>
                        </div>

                        {/* Task Rows */}
                        {!isCollapsed && (
                          <div
                            className={`flex flex-col border-b border-[var(--border-subtle)] last:border-b-0 transition-colors ${dragOverStatus === key ? "ring-1 ring-[var(--accent)]" : ""}`}
                            onDragOver={(e) => handleStatusDragOver(e, key)}
                            onDrop={(e) => handleStatusDrop(e, key)}
                            onDragLeave={() => {
                              if (dragOverStatus === key) {
                                setDragOverStatus(null);
                              }
                            }}
                          >
                            {groupItems.map((task) => (
                              <TaskRow
                                key={task._id}
                                task={task}
                                expandedTaskId={expandedTaskId}
                                setExpandedTaskId={setExpandedTaskId}
                                formatDueDate={formatDueDate}
                                isDueDateOverdue={isDueDateOverdue}
                                projects={projects}
                                users={users}
                                isAdmin={isAdmin}
                                enableDrag
                                draggingTaskId={draggingTaskId}
                                updatingTaskId={updatingTaskId}
                                onTaskDragStart={handleTaskDragStart}
                                onTaskDragEnd={handleTaskDragEnd}
                              />
                            ))}

                            {/* Inline Add Task */}
                            {addingInGroup === key ? (
                              <div className="relative z-20 flex flex-col border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2 gap-2">
                                {/* Row 1: Main Task Info */}
                                <div className="grid grid-cols-[1fr_120px_140px_140px_120px_130px_40px] gap-2 items-center">
                                  <div className="flex items-center gap-3 pl-2">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 4">
                                      <circle cx="12" cy="12" r="9" />
                                    </svg>
                                    <input
                                      ref={newTaskInputRef}
                                      type="text"
                                      value={newTaskName}
                                      onChange={(e) => setNewTaskName(e.target.value)}
                                      onKeyDown={handleInlineKeyDown}
                                      placeholder="Task name"
                                      disabled={isCreating}
                                      className="flex-1 bg-transparent outline-none text-[14px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--border-subtle)] rounded-md px-2.5 py-1.5"
                                    />
                                  </div>

                                  {/* Hours/Minutes Input */}
                                  <div className="flex gap-1 items-center">
                                    <input
                                      type="number"
                                      value={newTaskHoursInput}
                                      onChange={(e) => setNewTaskHoursInput(e.target.value)}
                                      placeholder="Hrs"
                                      min="0"
                                      className="w-[45px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-1 py-1.5 text-[12px] text-[var(--text-secondary)] outline-none transition-colors"
                                    />
                                    <span className="text-[var(--text-muted)] text-[10px]">:</span>
                                    <input
                                      type="number"
                                      value={newTaskMinutesInput}
                                      onChange={(e) => setNewTaskMinutesInput(e.target.value)}
                                      placeholder="Min"
                                      min="0"
                                      max="59"
                                      className="w-[45px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-1 py-1.5 text-[12px] text-[var(--text-secondary)] outline-none transition-colors"
                                    />
                                  </div>

                                  {/* Project dropdown */}
                                  <div className="relative" ref={projectDropdownRef}>
                                    <button
                                      onClick={() => { setProjectDropdownOpen(!projectDropdownOpen); setAssigneeDropdownOpen(false); setStatusDropdownOpenInline(false); }}
                                      className="w-full flex items-center gap-1.5 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-2.5 py-1.5 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-all outline-none"
                                    >
                                      {selectedProjectName ? (
                                        <span className="truncate flex-1 text-left">{selectedProjectName}</span>
                                      ) : (
                                        <span className="truncate flex-1 text-left text-[var(--text-muted)]">Project</span>
                                      )}
                                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-[var(--text-muted)]"><polyline points="6 9 12 15 18 9" /></svg>
                                    </button>
                                    {projectDropdownOpen && (
                                      <div className="absolute z-50 top-full left-0 mt-1 w-48 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] shadow-lg py-1 max-h-48 overflow-y-auto">
                                        <button
                                          onClick={() => { setNewTaskProject(""); setProjectDropdownOpen(false); }}
                                          className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-[var(--bg-surface)] transition-colors ${!newTaskProject ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "text-[var(--text-secondary)]"}`}
                                        >
                                          No project
                                        </button>
                                        {projects.map((p) => (
                                          <button
                                            key={p._id}
                                            onClick={() => { setNewTaskProject(p._id); setProjectDropdownOpen(false); }}
                                            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[13px] hover:bg-[var(--bg-surface)] transition-colors ${newTaskProject === p._id ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "text-[var(--text-secondary)]"}`}
                                          >
                                            <span className="truncate">{p.projectName}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Assignee dropdown */}
                                  <div className="relative" ref={assigneeDropdownRef}>
                                    {isAdmin ? (
                                      <>
                                        <button
                                          onClick={() => { setAssigneeDropdownOpen(!assigneeDropdownOpen); setProjectDropdownOpen(false); setStatusDropdownOpenInline(false); }}
                                          className="w-full flex items-center gap-1.5 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-2.5 py-1.5 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-all outline-none"
                                        >
                                          {selectedAssignee ? (
                                            <div className="w-4 h-4 rounded-full bg-gray-700 text-white flex items-center justify-center text-[7px] font-bold flex-shrink-0">
                                              {selectedAssignee.fullName?.charAt(0)}
                                            </div>
                                          ) : (
                                            <span className="truncate flex-1 text-left text-[var(--text-muted)]">Assignee</span>
                                          )}
                                          {selectedAssignee && <span className="truncate flex-1 text-left">{selectedAssignee.fullName}</span>}
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-[var(--text-muted)]"><polyline points="6 9 12 15 18 9" /></svg>
                                        </button>
                                        {assigneeDropdownOpen && (
                                          <div className="absolute z-50 top-full left-0 mt-1 w-48 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] shadow-lg py-1 max-h-48 overflow-y-auto">
                                            <button
                                              onClick={() => { setNewTaskAssignee(""); setAssigneeDropdownOpen(false); }}
                                              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-[var(--bg-surface)] transition-colors ${!newTaskAssignee ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "text-[var(--text-secondary)]"}`}
                                            >
                                              Unassigned
                                            </button>
                                            {availableUsers.map((u) => (
                                              <button
                                                key={u._id}
                                                onClick={() => { setNewTaskAssignee(u._id); setAssigneeDropdownOpen(false); }}
                                                className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-[var(--bg-surface)] transition-colors ${newTaskAssignee === u._id ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "text-[var(--text-secondary)]"}`}
                                              >
                                                <div className="w-5 h-5 rounded-full bg-gray-700 text-white flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                                                  {u.fullName?.charAt(0)}
                                                </div>
                                                <span className="truncate">{u.fullName}</span>
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                      </>
                                    ) : (
                                      <div className="w-full flex items-center gap-1.5 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-2.5 py-1.5 text-[12px] text-[var(--text-secondary)] opacity-80 cursor-not-allowed" title="You can only assign tasks to yourself">
                                        {selectedAssignee ? (
                                          <div className="w-4 h-4 rounded-full bg-gray-700 text-white flex items-center justify-center text-[7px] font-bold flex-shrink-0">
                                            {selectedAssignee.fullName?.charAt(0)}
                                          </div>
                                        ) : (
                                          <span className="truncate flex-1 text-left text-[var(--text-muted)]">Assignee</span>
                                        )}
                                        {selectedAssignee && <span className="truncate flex-1 text-left">{selectedAssignee.fullName}</span>}
                                      </div>
                                    )}
                                  </div>


                                  {/* Status */}
                                  <div className="relative" ref={statusDropdownRefInline}>
                                    <div className="inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)] overflow-hidden shadow-sm">
                                      <button
                                        onClick={() => { setStatusDropdownOpenInline(!statusDropdownOpenInline); setProjectDropdownOpen(false); setAssigneeDropdownOpen(false); }}
                                        className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase hover:bg-[var(--bg-surface)] transition-colors"
                                        style={{ color: getInlineStatusColor(newTaskStatus) }}
                                      >
                                        {getInlineStatusLabel(newTaskStatus)}
                                      </button>
                                      <button
                                        onClick={cycleNextStatus}
                                        className="flex items-center justify-center w-5 h-full border-l border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] transition-colors"
                                      >
                                        <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--text-muted)]">
                                          <path d="M8 5v14l11-7z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => setNewTaskStatus("completed")}
                                        className="flex items-center justify-center w-6 h-full border-l border-[var(--border-subtle)] hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                                      >
                                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={newTaskStatus === "completed" ? "#00b884" : "#a0a0a0"} strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                                      </button>
                                    </div>
                                    {statusDropdownOpenInline && (
                                      <div className="absolute z-30 top-full left-0 mt-1 w-36 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] shadow-lg py-1">
                                        {(["to-do", "in-progress", "completed"] as const).map((s) => (
                                          <button
                                            key={s}
                                            onClick={() => { setNewTaskStatus(s); setStatusDropdownOpenInline(false); }}
                                            className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] font-bold tracking-wide uppercase hover:bg-[var(--bg-surface)] transition-colors ${newTaskStatus === s ? "bg-blue-50 dark:bg-blue-900/30" : ""}`}
                                            style={{ color: getInlineStatusColor(s) }}
                                          >
                                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getInlineStatusColor(s) }} />
                                            {getInlineStatusLabel(s)}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  {/* Due date */}
                                  <div>
                                    <input
                                      type="date"
                                      value={newTaskDueDate}
                                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                                      className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-2 py-1 text-[11px] text-[var(--text-secondary)] outline-none transition-colors"
                                    />
                                  </div>

                                  {/* Submit and Cancel Buttons */}
                                  <div className="flex justify-center items-center gap-2">
                                    <button
                                      onClick={submitInlineTask}
                                      disabled={isCreating || !!validationError}
                                      className={`transition-colors ${validationError ? "text-gray-300 cursor-not-allowed" : "text-green-600 hover:text-green-700"}`}
                                      title={validationError || "Add Task"}
                                    >
                                      {isCreating ? (
                                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                                      ) : (
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                                      )}
                                    </button>
                                    <button
                                      onClick={() => setAddingInGroup(null)}
                                      disabled={isCreating}
                                      className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                                      title="Cancel"
                                    >
                                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                    </button>
                                  </div>
                                </div>

                                {/* Row 2: Subtasks */}
                                <div className="ml-8 pl-4 border-l-2 border-dashed border-[var(--border-subtle)]">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Subtasks</span>
                                    <span className={`text-[10px] ${Math.abs(totalSubtaskHours - totalEstHours) > 0.01 && totalEstHours > 0 ? "text-red-500 font-bold" : "text-green-600"}`}>
                                      Total time: {totalSubtaskHours.toFixed(2)} / {totalEstHours.toFixed(2) || "0.00"}h
                                    </span>
                                  </div>

                                  {/* Subtask List */}
                                  <div className="space-y-1 mb-2">
                                    {subtasks.map((st, idx) => (
                                      <div key={idx} className="flex items-center gap-2 text-[12px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] px-2 py-1 rounded-md">
                                        <span className="flex-1 text-[var(--text-primary)]">{st.text}</span>
                                        <span className="text-[var(--text-secondary)] font-mono">{toHHMM(st.hours, st.minutes)}</span>
                                        <button onClick={() => removeSubtask(idx)} className="text-red-400 hover:text-red-600">
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                        </button>
                                      </div>
                                    ))}
                                  </div>

                                  {/* Add Subtask Input */}
                                  <div className="flex gap-2 items-center">
                                    <input
                                      type="text"
                                      value={currentSubtaskText}
                                      onChange={(e) => setCurrentSubtaskText(e.target.value)}
                                      placeholder="Subtask description"
                                      className="flex-1 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none"
                                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
                                    />
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        value={currentSubtaskHours}
                                        onChange={(e) => setCurrentSubtaskHours(e.target.value)}
                                        placeholder="Hr"
                                        min="0"
                                        className="w-[35px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-1 py-1 text-[12px] text-[var(--text-primary)] outline-none text-center"
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
                                      />
                                      <span className="text-[var(--text-muted)] text-[10px]">:</span>
                                      <input
                                        type="number"
                                        value={currentSubtaskMinutes}
                                        onChange={(e) => setCurrentSubtaskMinutes(e.target.value)}
                                        placeholder="Min"
                                        min="0"
                                        max="59"
                                        className="w-[35px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-1 py-1 text-[12px] text-[var(--text-primary)] outline-none text-center"
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
                                      />
                                    </div>
                                    <button
                                      onClick={addSubtask}
                                      disabled={!currentSubtaskText.trim() || (parseInt(currentSubtaskHours || "0") === 0 && parseInt(currentSubtaskMinutes || "0") === 0) || isSubtaskOverAdminLimit}
                                      className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[11px] font-medium rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Add
                                    </button>
                                  </div>

                                  {/* Overall Validation Error - Show at bottom of panel */}
                                  {validationError && (
                                    <div className="mt-2 text-[11px] text-red-500 font-medium">
                                      * {validationError}
                                    </div>
                                  )}
                                  {submissionError && (
                                    <div className="mt-2 text-[11px] text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/30 p-2 rounded border border-red-200 dark:border-red-800">
                                      Error: {submissionError}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : !readOnly ? (
                              <div
                                onClick={() => startInlineAdd(key)}
                                className="flex items-center gap-2 px-10 py-2.5 text-[13px] text-[var(--text-muted)] hover:bg-[var(--bg-surface)] cursor-text transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                <span>Add Task</span>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <>
                    {items.map((task) => (
                      <TaskRow
                        key={task._id}
                        task={task}
                        expandedTaskId={expandedTaskId}
                        setExpandedTaskId={setExpandedTaskId}
                        formatDueDate={formatDueDate}
                        isDueDateOverdue={isDueDateOverdue}
                        projects={projects}
                        users={users}
                        isAdmin={isAdmin}
                        enableDrag={false}
                      />
                    ))}

                    {addingInGroup === "to-do" ? (
                      <div className="relative z-20 flex flex-col border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] p-2 gap-2">
                        {/* Row 1: Main Task Info */}
                        <div className="grid grid-cols-[1fr_120px_140px_140px_120px_130px_40px] gap-2 items-center">
                          <div className="flex items-center gap-3 pl-2">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 4">
                              <circle cx="12" cy="12" r="9" />
                            </svg>
                            <input
                              ref={newTaskInputRef}
                              type="text"
                              value={newTaskName}
                              onChange={(e) => setNewTaskName(e.target.value)}
                              onKeyDown={handleInlineKeyDown}
                              placeholder="Task name"
                              disabled={isCreating}
                              className="flex-1 bg-transparent outline-none text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--border-subtle)] rounded-md px-2 py-1"
                            />
                          </div>

                          {/* Hours/Minutes Input */}
                          <div className="flex gap-1 items-center">
                            <input
                              type="number"
                              value={newTaskHoursInput}
                              onChange={(e) => setNewTaskHoursInput(e.target.value)}
                              placeholder="Hrs"
                              min="0"
                              className="w-[45px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-1 py-1 text-[11px] text-[var(--text-secondary)] outline-none transition-colors"
                            />
                            <span className="text-[var(--text-muted)] text-[10px]">:</span>
                            <input
                              type="number"
                              value={newTaskMinutesInput}
                              onChange={(e) => setNewTaskMinutesInput(e.target.value)}
                              placeholder="Min"
                              min="0"
                              max="59"
                              className="w-[45px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-1 py-1 text-[11px] text-[var(--text-secondary)] outline-none transition-colors"
                            />
                          </div>

                          {/* Project dropdown */}
                          <div className="relative" ref={projectDropdownRef}>
                            <button
                              onClick={() => { setProjectDropdownOpen(!projectDropdownOpen); setAssigneeDropdownOpen(false); setStatusDropdownOpenInline(false); }}
                              className="w-full flex items-center gap-1.5 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-all outline-none"
                            >
                              {selectedProjectName ? (
                                <span className="truncate flex-1 text-left">{selectedProjectName}</span>
                              ) : (
                                <span className="truncate flex-1 text-left text-[var(--text-muted)]">Project</span>
                              )}
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-[var(--text-muted)]"><polyline points="6 9 12 15 18 9" /></svg>
                            </button>
                            {projectDropdownOpen && (
                              <div className="absolute z-50 top-full left-0 mt-1 w-48 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] shadow-lg py-1 max-h-48 overflow-y-auto">
                                <button
                                  onClick={() => { setNewTaskProject(""); setProjectDropdownOpen(false); }}
                                  className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-[var(--bg-surface)] transition-colors ${!newTaskProject ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "text-[var(--text-secondary)]"}`}
                                >
                                  No project
                                </button>
                                {projects.map((p) => (
                                  <button
                                    key={p._id}
                                    onClick={() => { setNewTaskProject(p._id); setProjectDropdownOpen(false); }}
                                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-[var(--bg-surface)] transition-colors ${newTaskProject === p._id ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "text-[var(--text-secondary)]"}`}
                                  >
                                    <span className="truncate">{p.projectName}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Assignee dropdown */}
                          <div className="relative" ref={assigneeDropdownRef}>
                            {isAdmin ? (
                              <>
                                <button
                                  onClick={() => { setAssigneeDropdownOpen(!assigneeDropdownOpen); setProjectDropdownOpen(false); setStatusDropdownOpenInline(false); }}
                                  className="w-full flex items-center gap-1.5 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-2 py-1 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] transition-all outline-none"
                                >
                                  {selectedAssignee ? (
                                    <div className="w-4 h-4 rounded-full bg-gray-700 text-white flex items-center justify-center text-[7px] font-bold flex-shrink-0">
                                      {selectedAssignee.fullName?.charAt(0)}
                                    </div>
                                  ) : (
                                    <span className="truncate flex-1 text-left text-[var(--text-muted)]">Assignee</span>
                                  )}
                                  {selectedAssignee && <span className="truncate flex-1 text-left">{selectedAssignee.fullName}</span>}
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 text-[var(--text-muted)]"><polyline points="6 9 12 15 18 9" /></svg>
                                </button>
                                {assigneeDropdownOpen && (
                                  <div className="absolute z-50 top-full left-0 mt-1 w-48 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] shadow-lg py-1 max-h-48 overflow-y-auto">
                                    <button
                                      onClick={() => { setNewTaskAssignee(""); setAssigneeDropdownOpen(false); }}
                                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-[var(--bg-surface)] transition-colors ${!newTaskAssignee ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "text-[var(--text-secondary)]"}`}
                                    >
                                      Unassigned
                                    </button>
                                    {availableUsers.map((u) => (
                                      <button
                                        key={u._id}
                                        onClick={() => { setNewTaskAssignee(u._id); setAssigneeDropdownOpen(false); }}
                                        className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-[var(--bg-surface)] transition-colors ${newTaskAssignee === u._id ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400" : "text-[var(--text-secondary)]"}`}
                                      >
                                        <div className="w-5 h-5 rounded-full bg-gray-700 text-white flex items-center justify-center text-[8px] font-bold flex-shrink-0">
                                          {u.fullName?.charAt(0)}
                                        </div>
                                        <span className="truncate">{u.fullName}</span>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-[11px] text-[var(--text-muted)]">—</span>
                            )}
                          </div>

                          {/* Status */}
                          <div className="relative" ref={statusDropdownRefInline}>
                            <div className="inline-flex items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-canvas)] overflow-hidden shadow-sm">
                              <button
                                onClick={() => { setStatusDropdownOpenInline(!statusDropdownOpenInline); setProjectDropdownOpen(false); setAssigneeDropdownOpen(false); }}
                                className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold tracking-wide uppercase hover:bg-[var(--bg-surface)] transition-colors"
                                style={{ color: getInlineStatusColor(newTaskStatus) }}
                              >
                                {getInlineStatusLabel(newTaskStatus)}
                              </button>
                              <button
                                onClick={cycleNextStatus}
                                className="flex items-center justify-center w-5 h-full border-l border-[var(--border-subtle)] hover:bg-[var(--bg-surface)] transition-colors"
                              >
                                <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="text-[var(--text-muted)]">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setNewTaskStatus("completed")}
                                className="flex items-center justify-center w-6 h-full border-l border-[var(--border-subtle)] hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
                              >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={newTaskStatus === "completed" ? "#00b884" : "#a0a0a0"} strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                              </button>
                            </div>
                            {statusDropdownOpenInline && (
                              <div className="absolute z-30 top-full left-0 mt-1 w-36 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] shadow-lg py-1">
                                {(["to-do", "in-progress", "completed"] as const).map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => { setNewTaskStatus(s); setStatusDropdownOpenInline(false); }}
                                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-left text-[11px] font-bold tracking-wide uppercase hover:bg-[var(--bg-surface)] transition-colors ${newTaskStatus === s ? "bg-blue-50 dark:bg-blue-900/30" : ""}`}
                                    style={{ color: getInlineStatusColor(s) }}
                                  >
                                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getInlineStatusColor(s) }} />
                                    {getInlineStatusLabel(s)}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Due date */}
                          <div>
                            <input
                              type="date"
                              value={newTaskDueDate}
                              onChange={(e) => setNewTaskDueDate(e.target.value)}
                              className="w-full bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-2 py-1 text-[11px] text-[var(--text-secondary)] outline-none transition-colors"
                            />
                          </div>

                          {/* Submit and Cancel Buttons */}
                          <div className="flex justify-center items-center gap-2">
                            <button
                              onClick={submitInlineTask}
                              disabled={isCreating || !!validationError}
                              className={`transition-colors ${validationError ? "text-gray-300 cursor-not-allowed" : "text-green-600 hover:text-green-700"}`}
                              title={validationError || "Add Task"}
                            >
                              {isCreating ? (
                                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                              ) : (
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                              )}
                            </button>
                            <button
                              onClick={() => setAddingInGroup(null)}
                              disabled={isCreating}
                              className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                              title="Cancel"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                          </div>
                        </div>

                        {/* Row 2: Subtasks */}
                        <div className="ml-8 pl-4 border-l-2 border-dashed border-[var(--border-subtle)]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">Subtasks</span>
                            <span className={`text-[10px] ${Math.abs(totalSubtaskHours - totalEstHours) > 0.01 && totalEstHours > 0 ? "text-red-500 font-bold" : "text-green-600"}`}>
                              Total time: {totalSubtaskHours.toFixed(2)} / {totalEstHours.toFixed(2) || "0.00"}h
                            </span>
                          </div>

                          {/* Subtask List */}
                          <div className="space-y-1 mb-2">
                            {subtasks.map((st, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-[12px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] px-2 py-1 rounded-md">
                                <span className="flex-1 text-[var(--text-primary)]">{st.text}</span>
                                <span className="text-[var(--text-secondary)] font-mono">{toHHMM(st.hours, st.minutes)}</span>
                                <button onClick={() => removeSubtask(idx)} className="text-red-400 hover:text-red-600">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                </button>
                              </div>
                            ))}
                          </div>

                          {/* Add Subtask Input */}
                          <div className="flex gap-2 items-center">
                            <input
                              type="text"
                              value={currentSubtaskText}
                              onChange={(e) => setCurrentSubtaskText(e.target.value)}
                              placeholder="Subtask description"
                              className="flex-1 bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-2 py-1 text-[12px] text-[var(--text-primary)] outline-none"
                              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                            />
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                value={currentSubtaskHours}
                                onChange={(e) => setCurrentSubtaskHours(e.target.value)}
                                placeholder="Hr"
                                min="0"
                                className="w-[35px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-1 py-1 text-[12px] text-[var(--text-primary)] outline-none text-center"
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                              />
                              <span className="text-[var(--text-muted)] text-[10px]">:</span>
                              <input
                                type="number"
                                value={currentSubtaskMinutes}
                                onChange={(e) => setCurrentSubtaskMinutes(e.target.value)}
                                placeholder="Min"
                                min="0"
                                max="59"
                                className="w-[35px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-1 py-1 text-[12px] text-[var(--text-primary)] outline-none text-center"
                                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSubtask(); } }}
                              />
                            </div>
                            <button
                              onClick={addSubtask}
                              disabled={!currentSubtaskText.trim() || (parseInt(currentSubtaskHours || "0") === 0 && parseInt(currentSubtaskMinutes || "0") === 0) || isSubtaskOverAdminLimit}
                              className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[11px] font-medium rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Add
                            </button>
                          </div>

                          {/* Overall Validation Error - Show at bottom of panel */}
                          {validationError && (
                            <div className="mt-2 text-[11px] text-red-500 font-medium">
                              * {validationError}
                            </div>
                          )}
                          {submissionError && (
                            <div className="mt-2 text-[11px] text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/30 p-2 rounded border border-red-200 dark:border-red-800">
                              Error: {submissionError}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : !readOnly ? (
                      <div
                        onClick={() => startInlineAdd("to-do")}
                        className="flex items-center gap-2 px-10 py-2 text-[13px] text-[var(--text-muted)] hover:bg-[var(--bg-surface)] cursor-text transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                        <span>Add Task</span>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {displayTotal > 0 && (
        <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-3">
            <span>
              Showing {shownStart}–{shownEnd} of {displayTotal}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-muted)]">Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-md px-1.5 py-0.5 text-xs text-[var(--text-secondary)] outline-none cursor-pointer"
              >
                {[5, 10, 15, 25, 50].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              disabled={!pagination.hasPreviousPage}
              className="ck-btn-secondary py-1 px-2.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-[var(--text-tertiary)]">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              onClick={handleNext}
              disabled={!pagination.hasNextPage}
              className="ck-btn-secondary py-1 px-2.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Task Row Component ---
type TaskRowProps = {
  task: Task;
  expandedTaskId: string | null;
  setExpandedTaskId: React.Dispatch<React.SetStateAction<string | null>>;
  formatDueDate: (dateString?: string) => string;
  isDueDateOverdue: (dateString?: string) => boolean;
  projects: Array<{ _id: string; projectName: string }>;
  users: Array<{ _id: string; fullName: string }>;
  isAdmin: boolean;
  enableDrag?: boolean;
  draggingTaskId?: string | null;
  updatingTaskId?: string | null;
  onTaskDragStart?: (e: React.DragEvent<HTMLDivElement>, task: Task) => void;
  onTaskDragEnd?: () => void;
};

function TaskRow({ task, expandedTaskId, setExpandedTaskId, formatDueDate, isDueDateOverdue, projects, users, isAdmin, enableDrag = false, draggingTaskId = null, updatingTaskId = null, onTaskDragStart, onTaskDragEnd }: TaskRowProps) {
  const isExpanded = expandedTaskId === task._id;
  const lookupId = task._id;
  const queryClient = useQueryClient();

  const [editingDetailIndex, setEditingDetailIndex] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Click-outside handler for status dropdown
  useEffect(() => {
    if (!statusDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setStatusDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [statusDropdownOpen]);

  const { data, isLoading: detailsLoading, isError: detailsError } = useQuery({
    queryKey: ["task-details", lookupId],
    queryFn: () => tasksApi.getTaskDetails(lookupId),
    enabled: isExpanded,
    staleTime: 5 * 60 * 1000,
  });

  const details = Array.isArray(data?.details) ? data.details : [];

  const settingsTotalSubtaskHours = useMemo(() => {
    return details.reduce((acc: number, curr: TaskDetail) => {
      if (!curr.time) return acc;
      const [h, m] = curr.time.split(":").map(Number);
      return acc + (h || 0) + (m || 0) / 60;
    }, 0);
  }, [details]);

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case "completed": return "bg-[#00b884] text-white";
      case "in-progress": return "bg-[#0088FF] text-white";
      case "to-do":
      default: return "bg-[#d3d3d3] text-gray-700";
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case "completed": return "DONE";
      case "in-progress": return "IN PROGRESS";
      case "to-do":
      default: return "TO DO";
    }
  };

  const handleEditDetail = (index: number, detail: TaskDetail) => {
    setEditingDetailIndex(index);
    setEditText(detail.text);
    setEditTime(detail.time || "00:00");
    setEditError("");
  };

  const handleCancelEdit = () => {
    setEditingDetailIndex(null);
    setEditText("");
    setEditTime("");
    setEditError("");
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) {
      setEditError("Detail text is required");
      return;
    }

    if (!/^\d{2}:\d{2}$/.test(editTime)) {
      setEditError("Time must be in HH:MM format");
      return;
    }

    const [hours, minutes] = editTime.split(":").map(Number);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      setEditError("Time must be in HH:MM format and a valid time");
      return;
    }

    setEditLoading(true);
    try {
      await tasksApi.updateTaskDetail(task._id, editingDetailIndex!, editText.trim(), editTime);
      queryClient.invalidateQueries({ queryKey: ["task-details", lookupId] });
      handleCancelEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update detail";
      setEditError(message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: "to-do" | "in-progress" | "completed") => {
    setUpdatingStatus(true);
    try {
      await tasksApi.updateTaskStatus(task._id, newStatus);
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setStatusDropdownOpen(false);
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const overdue = isDueDateOverdue(task.dueDate) && task.status !== "completed";
  const dueDateStr = formatDueDate(task.dueDate);

  return (
    <>
      <div
        draggable={enableDrag && updatingTaskId !== task._id}
        onDragStart={(e) => onTaskDragStart?.(e, task)}
        onDragEnd={() => onTaskDragEnd?.()}
        onClick={() => setExpandedTaskId(isExpanded ? null : task._id)}
        className={`grid grid-cols-[1fr_120px_140px_140px_120px_130px_40px] gap-2 items-center px-4 py-2.5 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-surface)] group text-[14px] bg-[var(--bg-canvas)] transition-colors cursor-pointer ${enableDrag ? "cursor-grab active:cursor-grabbing" : ""} ${draggingTaskId === task._id ? "opacity-60" : "opacity-100"} ${updatingTaskId === task._id ? "pointer-events-none" : ""}`}
      >
        {/* Name */}
        <div className="flex items-center gap-3 pl-2">
          <div className="w-3 h-4 text-[var(--text-muted)] transition-opacity opacity-0 group-hover:opacity-100" aria-hidden="true">
            <svg viewBox="0 0 12 16" fill="currentColor" className="w-3 h-4">
              <circle cx="3" cy="3" r="1.2" />
              <circle cx="9" cy="3" r="1.2" />
              <circle cx="3" cy="8" r="1.2" />
              <circle cx="9" cy="8" r="1.2" />
              <circle cx="3" cy="13" r="1.2" />
              <circle cx="9" cy="13" r="1.2" />
            </svg>
          </div>
          <div className="text-[var(--text-muted)] group-hover:text-[var(--text-tertiary)] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b0b0b0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 4">
              <circle cx="12" cy="12" r="9" />
            </svg>
          </div>
          <div className="flex items-center gap-2 truncate">
            <span className="truncate font-medium text-[var(--text-primary)]">{task.taskName}</span>
            <svg className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </div>
        </div>

        {/* Hours */}
        <div className="text-[13px] text-[var(--text-secondary)]">
          {task.hours ? `${task.hours.toFixed(2)}h` : "—"}
        </div>

        {/* Project */}
        <div className="text-[13px] text-[var(--text-secondary)] truncate">
          {task.projectName || <span className="text-[var(--text-muted)]">—</span>}
        </div>

        {/* Assigned To */}
        <div className="text-[13px] text-[var(--text-secondary)] truncate pl-1">
          {task.assignedToName ? (
            <div
              className="w-6 h-6 rounded-full bg-gray-700 text-white flex items-center justify-center text-[10px] font-bold border border-black"
              title={task.assignedToName}
            >
              {task.assignedToName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
          ) : (
            <div className="w-6 h-6 rounded-full border border-dashed border-[var(--border-subtle)] flex items-center justify-center" title="Unassigned">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-muted)]">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="relative" onClick={(e) => e.stopPropagation()} ref={statusDropdownRef}>
          <button
            onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
            disabled={updatingStatus}
            className={`inline-flex items-center rounded px-2.5 py-1 text-[11px] font-bold tracking-wide ${getStatusBadgeClass(task.status)} ${updatingStatus ? "opacity-50" : "hover:opacity-80"} transition-all`}
          >
            {getStatusLabel(task.status)}
          </button>

          {statusDropdownOpen && (
            <div className="absolute z-20 mt-1 w-28 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-canvas)] shadow-lg py-1">
              {(["to-do", "in-progress", "completed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className="w-full px-3 py-2 text-left text-[13px] hover:bg-[var(--bg-surface)] transition-colors"
                >
                  <span className={`inline-flex items-center rounded px-2.5 py-0.5 text-[11px] font-bold ${getStatusBadgeClass(s)}`}>
                    {getStatusLabel(s)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Due date */}
        <div className="flex items-center text-[13px]">
          <span className={overdue ? "text-[#e03a3a] font-medium" : "text-[var(--text-secondary)]"}>
            {dueDateStr}
          </span>
        </div>

        {/* Actions */}
        <div className="flex justify-center text-[var(--text-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--text-secondary)] cursor-pointer transition-all text-lg">
          ···
        </div>
      </div>

      {/* Expanded Details — ClickUp-style panel */}
      {isExpanded && (
        <div className="bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
          <div className="flex gap-0 min-h-[300px]">
            {/* Left: Task content */}
            <div className="flex-1 p-6 border-r border-[var(--border-subtle)]">
              <div className="flex items-center gap-2 mb-4">
                <span className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold tracking-wide ${getStatusBadgeClass(task.status)}`}>
                  {getStatusLabel(task.status)}
                </span>
                <span className="text-[var(--text-muted)] text-xs">·</span>
                <span className="text-xs text-[var(--text-secondary)]">{task.projectName || "No project"}</span>
              </div>

              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-4">{task.taskName}</h3>

              {/* Properties grid */}
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-4 text-sm">
                  <span className="w-24 text-[var(--text-muted)] flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /></svg>
                    Assignee
                  </span>
                  <span className="text-[var(--text-primary)]">{task.assignedToName || "Unassigned"}</span>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <span className="w-24 text-[var(--text-muted)] flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                    Dates
                  </span>
                  <span className="text-[var(--text-primary)]">
                    {task.startDate ? new Date(task.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                    {task.startDate && task.dueDate && " → "}
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <span className="w-24 text-[var(--text-muted)] flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                    Hours
                  </span>
                  <span className="text-[var(--text-primary)]">{task.hours}h</span>
                </div>
              </div>

              {/* Subtasks Section */}
              <div className="border-t border-[var(--border-subtle)] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)]">Subtasks</h4>
                  {!detailsLoading && details.length > 0 && (
                    <span className={`text-[10px] ${Math.abs(settingsTotalSubtaskHours - task.hours) > 0.01 ? "text-red-500 font-bold" : "text-green-600"}`}>
                      Total time: {settingsTotalSubtaskHours.toFixed(2)} / {task.hours.toFixed(2)}h
                    </span>
                  )}
                </div>

                {detailsLoading ? (
                  <div className="text-sm text-[var(--text-tertiary)] flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Loading subtasks…
                  </div>
                ) : detailsError ? (
                  <div className="text-sm text-[var(--status-error)]">Failed to load subtasks.</div>
                ) : details.length === 0 ? (
                  <div className="text-sm text-[var(--text-tertiary)]">No subtasks available.</div>
                ) : (
                  <div className="pl-4 border-l-2 border-dashed border-[var(--border-subtle)] space-y-2">
                    {details.map((d: TaskDetail, i: number) => {
                      const isEditing = editingDetailIndex === i;

                      return isEditing ? (
                        <div key={`edit-${i}`} className="rounded-lg border border-[var(--ck-blue)] bg-[var(--bg-canvas)] p-3">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="ck-input w-full text-sm"
                            rows={2}
                          />
                          <div className="flex items-center gap-2 mt-2">
                            <input
                              type="text"
                              value={editTime}
                              onChange={(e) => setEditTime(e.target.value)}
                              placeholder="HH:MM"
                              className="ck-input w-20 text-sm"
                            />
                            {editError && <span className="text-xs text-[var(--status-error)]">{editError}</span>}
                            <div className="flex-1" />
                            <button onClick={handleSaveEdit} disabled={editLoading} className="ck-btn-primary text-xs py-1 px-3">
                              {editLoading ? "Saving..." : "Save"}
                            </button>
                            <button onClick={handleCancelEdit} disabled={editLoading} className="ck-btn-secondary text-xs py-1 px-3">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div
                          key={`detail-${i}`}
                          onClick={(e) => { e.stopPropagation(); handleEditDetail(i, { ...d, time: d.time || "00:00" }); }}
                          className="flex items-center gap-2 text-[13px] bg-[var(--bg-canvas)] border border-[var(--border-subtle)] px-3 py-2 rounded-md hover:border-blue-300 dark:hover:border-blue-500 cursor-pointer group/detail transition-all"
                        >
                          <span className="flex-1 text-[var(--text-primary)]">{d.text}</span>
                          {d.time && <span className="text-[var(--text-secondary)] font-mono text-xs">{d.time}</span>}
                          <svg className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-hover/detail:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Activity panel placeholder */}
            <div className="w-[280px] p-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-sm text-[var(--text-primary)]">Activity</h4>
                <button
                  onClick={(e) => { e.stopPropagation(); setExpandedTaskId(null); }}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              </div>
              <div className="text-xs text-[var(--text-muted)] space-y-3">
                {task.createdAt && (
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                    <div>
                      <span>Task created</span>
                      <span className="block text-[var(--text-muted)]">
                        {new Date(task.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
