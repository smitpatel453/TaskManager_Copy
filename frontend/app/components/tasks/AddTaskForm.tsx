// components/tasks/AddTaskForm.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "../../../src/api/tasks.api";
import { projectsApi } from "../../../src/api/projects.api";
import type { CreateTaskRequest, DetailBlock, TaskStatus } from "../../../src/types/task";

type AddTaskFormProps = {
  onAdded?: () => void | Promise<void>;
  queryClient?: ReturnType<typeof useQueryClient>;
};

const makeDetail = (): DetailBlock => ({ text: "", hours: 0, minutes: 0 });

export default function AddTaskForm({ onAdded, queryClient: qc }: AddTaskFormProps) {
  const defaultQueryClient = useQueryClient();
  const queryClient = qc || defaultQueryClient;
  const [open, setOpen] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setIsAdmin(user.role === "admin");
      } catch (e) {
        setIsAdmin(false);
      }
    }
  }, []);

  const [taskName, setTaskName] = useState("");
  const [hours, setHours] = useState<number>(0);
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<TaskStatus>("to-do");
  const [assignedTo, setAssignedTo] = useState("");
  const [projectId, setProjectId] = useState("");

  const [details, setDetails] = useState<DetailBlock[]>([makeDetail()]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Fetch users for admin dropdown
  const { data: usersData, isLoading: loadingUsers } = useQuery({
    queryKey: ["users-dropdown"],
    queryFn: projectsApi.getAllUsersForDropdown,
    enabled: isAdmin && open,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch projects using React Query (use cache from projects page)
  const { data: projectsData, isLoading: loadingProjects } = useQuery({
    queryKey: ["projects", isAdmin ? "admin" : "user"],
    queryFn: isAdmin ? projectsApi.getAllProjects : projectsApi.getMyProjects,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  const users = usersData?.data || [];
  const projects = projectsData?.data || [];

  useEffect(() => {
    if (open) {
      setProjectId("");
    }
  }, [open, assignedTo, isAdmin]);

  function openModal() {
    setError("");
    setTaskName("");
    setHours(0);
    setStartDate("");
    setDueDate("");
    setStatus("to-do");
    setAssignedTo("");
    setProjectId("");
    setDetails([makeDetail()]);
    setOpen(true);
  }

  function closeModal() {
    if (loading) return;
    setOpen(false);
    setError("");
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeModal();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading]);

  function addDetailRow() {
    setDetails((prev) => [...prev, makeDetail()]);
  }

  function removeDetailRow(index: number) {
    setDetails((prev) => prev.filter((_, i) => i !== index));
  }

  function updateDetail(index: number, patch: Partial<DetailBlock>) {
    setDetails((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d))
    );
  }

  const totalMinutes = useMemo(() => {
    return details.reduce((sum, d) => {
      if (!d.text.trim()) return sum;
      const h = Number(d.hours);
      const m = Number(d.minutes);
      if (Number.isNaN(h) || Number.isNaN(m)) return sum;
      const safeH = Math.max(0, Math.floor(h));
      const safeM = Math.min(59, Math.max(0, Math.floor(m)));
      return sum + safeH * 60 + safeM;
    }, 0);
  }, [details]);

  const totalHoursFromDetails = useMemo(() => totalMinutes / 60, [totalMinutes]);

  const detailsValidationError = useMemo(() => {
    const validDetails = details.filter((d) => d.text.trim().length > 0);
    if (validDetails.length === 0) return "Please add at least one detail.";
    if (hours == 0) return "Hours cannot be 0. Please enter the estimated hours for the task.";
    if (isAdmin && !assignedTo) return "Please select a user to assign the task.";
    if (isAdmin && !projectId) return "Please select a project.";
    if (!startDate) return "Please select a start date.";
    if (!dueDate) return "Please select a due date.";
    if (startDate && dueDate && new Date(dueDate) < new Date(startDate)) {
      return "Due date cannot be before start date.";
    }
    if (hours >= 4 && validDetails.length < 3) {
      return `For tasks >= 4 hours, you must add at least 3 task details (currently ${validDetails.length}).`;
    }
    if (hours === 3 && validDetails.length < 2) {
      return `For tasks = 3 hours, you must add at least 2 task details (currently ${validDetails.length}).`;
    }

    for (let i = 0; i < details.length; i++) {
      const d = details[i];
      if (!d.text.trim()) continue;
      const h = Number(d.hours);
      const m = Number(d.minutes);
      if (m < 0 || m > 59) return `Detail ${i + 1}: minutes must be between 0 and 59.`;
      if (h < 0) return `Detail ${i + 1}: hours cannot be negative.`;
      if ((h ?? 0) === 0 && (m ?? 0) === 0) {
        return `Detail ${i + 1}: duration must be > 0 (hours or minutes).`;
      }
    }
    if (hours > 0 && Math.abs(totalHoursFromDetails - hours) > 0.01) {
      return `Total detail time (${totalHoursFromDetails.toFixed(2)}h) must exactly match the hours value (${hours}h).`;
    }

    return "";
  }, [details, hours, startDate, dueDate, totalHoursFromDetails, projectId, isAdmin, assignedTo]);

  function toHHMM(hours: number, minutes: number) {
    const h = Math.max(0, Math.floor(hours || 0));
    const m = Math.min(59, Math.max(0, Math.floor(minutes || 0)));
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (detailsValidationError) {
      setError(detailsValidationError);
      return;
    }

    setLoading(true);

    try {
      const cleanedDetails = details
        .map((d) => ({
          text: d.text.trim(),
          time: toHHMM(d.hours ?? 0, d.minutes ?? 0),
        }))
        .filter((d) => d.text.length > 0);

      const payload: CreateTaskRequest = {
        taskName: taskName.trim(),
        hours: hours,
        details: cleanedDetails,
        startDate,
        dueDate,
        status,
      };

      if (projectId) {
        payload.projectId = projectId;
      }

      if (isAdmin && assignedTo) {
        payload.assignedTo = assignedTo;
      }

      const data = await tasksApi.createTask(payload);

      if (data.insertedId && data.task?.details) {
        queryClient.setQueryData(
          ["task-details", data.insertedId],
          { ok: true, details: data.task.details }
        );
      }

      setTaskName("");
      setHours(0);
      setStartDate("");
      setDueDate("");
      setStatus("to-do");
      setAssignedTo("");
      setProjectId("");
      setDetails([makeDetail()]);
      setOpen(false);

      await onAdded?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add task";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Add Button */}
      <button
        type="button"
        onClick={openModal}
        className="claude-btn-primary flex items-center gap-2"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 5v14M5 12h14" strokeLinecap="round" />
        </svg>
        Add Task
      </button>

      {/* Modal */}
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-task-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl shadow-xl">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-subtle)]">
              <h3 id="add-task-title" className="font-display text-xl font-semibold text-[var(--text-primary)]">
                Add Task
              </h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Close"
                className="claude-btn-quiet"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                  <p className="text-sm text-[var(--status-error)]">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Task name
                </label>
                <input
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  placeholder="e.g. API Integration"
                  required
                  className="claude-input w-full"
                  autoFocus
                />
              </div>

              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Assign to user (optional for personal task)
                  </label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="claude-input w-full"
                    disabled={loadingUsers}
                  >
                    <option value="">
                      {loadingUsers ? "Loading users..." : "Select a user (or leave for personal task)"}
                    </option>
                    {users.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Project {!isAdmin && <span className="text-[var(--text-muted)]">(optional)</span>}
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  required={isAdmin}
                  className="claude-input w-full"
                  disabled={loadingProjects}
                >
                  <option value="">
                    {loadingProjects
                      ? "Loading projects..."
                      : projects.length === 0
                      ? "No projects available"
                      : isAdmin ? "Select a project" : "Select a project (optional)"}
                  </option>
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>
                      {project.projectName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Hours
                </label>
                <input
                  type="number"
                  value={hours}
                  onChange={(e) => setHours(Number(e.target.value))}
                  min={0}
                  step="0.5"
                  required
                  className="claude-input w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="claude-input w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                    Due date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                    className="claude-input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as TaskStatus)}
                  className="claude-input w-full"
                >
                  <option value="to-do">To do</option>
                  <option value="in-progress">In progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              {totalHoursFromDetails > 0 && (
                <div className={`text-sm ${totalHoursFromDetails > hours ? "text-[var(--status-error)]" : "text-[var(--text-tertiary)]"}`}>
                  Total detail time: {totalHoursFromDetails.toFixed(2)} hours
                </div>
              )}

              {/* Details section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium text-[var(--text-secondary)]">Details (with time)</div>
                </div>

                {details.map((d, idx) => (
                  <div key={idx} className="border border-[var(--border-subtle)] rounded-lg p-4 space-y-3 bg-[var(--bg-canvas)]">
                    <div className="flex gap-2 items-center">
                      <input
                        value={d.text}
                        onChange={(e) => updateDetail(idx, { text: e.target.value })}
                        placeholder={`Detail ${idx + 1}`}
                        className="claude-input flex-1"
                      />

                      {idx === details.length - 1 ? (
                        <button
                          type="button"
                          onClick={addDetailRow}
                          aria-label="Add another detail"
                          title="Add another detail"
                          className="claude-btn-secondary p-2"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 6v12M6 12h12" strokeLinecap="round" />
                          </svg>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeDetailRow(idx)}
                          aria-label="Remove this detail"
                          title="Remove"
                          className="claude-btn-secondary p-2 text-[var(--status-error)] border-red-200 hover:bg-red-50"
                        >
                          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-[var(--text-tertiary)] mb-1">Hours</label>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={d.hours}
                          onChange={(e) => {
                            const next = Number(e.target.value);
                            updateDetail(idx, { hours: Number.isFinite(next) ? next : 0 });
                          }}
                          className="claude-input w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-xs text-[var(--text-tertiary)] mb-1">Minutes</label>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          step={1}
                          value={d.minutes}
                          onChange={(e) => {
                            let next = Number(e.target.value);
                            if (!Number.isFinite(next)) next = 0;
                            next = Math.max(0, Math.min(59, Math.floor(next)));
                            updateDetail(idx, { minutes: next });
                          }}
                          className="claude-input w-full"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  className="claude-btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" disabled={loading} className="claude-btn-primary">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Adding...
                    </span>
                  ) : (
                    "Add Task"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
