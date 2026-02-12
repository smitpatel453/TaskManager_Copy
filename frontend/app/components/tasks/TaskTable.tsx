// components/tasks/TaskTable.tsx
"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { tasksApi } from "../../../src/api/tasks.api";

export type TaskDetail = {
  text: string;
  time: string; // "HH:MM"
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
  startDate?: string;
  dueDate?: string;
};

const stickyNoteThemes = [
  {
    card: "bg-amber-200",
    text: "text-neutral-900",
    badge: "bg-black/10 text-neutral-900",
  },
  {
    card: "bg-orange-300",
    text: "text-neutral-900",
    badge: "bg-black/10 text-neutral-900",
  },
  {
    card: "bg-lime-200",
    text: "text-neutral-900",
    badge: "bg-black/10 text-neutral-900",
  },
  {
    card: "bg-violet-300",
    text: "text-neutral-900",
    badge: "bg-black/10 text-neutral-900",
  },
  {
    card: "bg-sky-300",
    text: "text-neutral-900",
    badge: "bg-black/10 text-neutral-900",
  },
] as const;

export default function TaskTable() {
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filter, setFilter] = useState<"all" | "created" | "assigned">("all");

  // Fetch tasks with server-side pagination and filtering
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tasks", currentPage, itemsPerPage, filter],
    queryFn: () => tasksApi.getTasks(currentPage, itemsPerPage, filter),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const items = data?.data || [];
  const pagination = data?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  const handlePrevious = () => {
    if (pagination.hasPreviousPage) {
      setCurrentPage((p) => p - 1);
    }
  };

  const handleNext = () => {
    if (pagination.hasNextPage) {
      setCurrentPage((p) => p + 1);
    }
  };

  const handlePageClick = (page: number) => setCurrentPage(page);

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(parseInt(e.target.value, 10));
    setCurrentPage(1);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilter(e.target.value as "all" | "created" | "assigned");
    setCurrentPage(1);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxButtons = 5;
    const totalPages = pagination.totalPages;

    if (totalPages <= maxButtons) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    pages.push(1);
    if (currentPage > 3) pages.push("...");

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);

    return pages;
  };

  const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage + 1;
  const endIndex = Math.min(
    pagination.currentPage * pagination.itemsPerPage,
    pagination.totalItems
  );

  return (
    <div className="w-full">
      {/* Filter Section */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor="taskFilter" className="text-sm font-medium text-gray-700">
            Filter:
          </label>
          <select
            id="taskFilter"
            value={filter}
            onChange={handleFilterChange}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
          >
            <option value="all">All Tasks</option>
            <option value="created">Created by Me</option>
            <option value="assigned">Assigned to Me</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-10 bg-gray-50 text-gray-700">
              <tr>
                <th className="whitespace-nowrap border-b border-gray-200 px-4 py-3 text-left font-semibold">
                  No
                </th>
                <th className="whitespace-nowrap border-b border-gray-200 px-4 py-3 text-left font-semibold">
                  Task Name
                </th>
                <th className="whitespace-nowrap border-b border-gray-200 px-4 py-3 text-left font-semibold">
                  Project
                </th>
                <th className="whitespace-nowrap border-b border-gray-200 px-4 py-3 text-left font-semibold">
                  Status
                </th>
                <th className="border-b border-gray-200 px-4 py-3 text-left font-semibold">
                  Details
                </th>
                <th className="whitespace-nowrap border-b border-gray-200 px-4 py-3 text-left font-semibold">
                  Hours
                </th>
                <th className="whitespace-nowrap border-b border-gray-200 px-4 py-3 text-left font-semibold">
                  Due Date
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td className="px-4 py-10 text-center text-gray-500" colSpan={7}>
                    Loading tasks...
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td className="px-4 py-10 text-center text-red-500" colSpan={7}>
                    Failed to load tasks. Please try again.
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-10 text-center text-gray-500" colSpan={7}>
                    No tasks yet.
                  </td>
                </tr>
              ) : (
                items.map((t) => (
                  <TaskRow
                    key={t._id}
                    task={t}
                    expandedTaskId={expandedTaskId}
                    setExpandedTaskId={setExpandedTaskId}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isLoading && !isError && pagination.totalItems > 0 && (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-gray-600">
            Showing{" "}
            <span className="font-medium text-gray-900">
              {startIndex}
            </span>{" "}
            –{" "}
            <span className="font-medium text-gray-900">
              {endIndex}
            </span>{" "}
            of <span className="font-medium text-gray-900">{pagination.totalItems}</span>
          </div>

          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevious}
                disabled={!pagination.hasPreviousPage}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>

              <div className="flex items-center gap-1">
                {getPageNumbers().map((page, idx) =>
                  page === "..." ? (
                    <span
                      key={idx}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-sm text-gray-400"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={idx}
                      onClick={() => handlePageClick(page as number)}
                      aria-current={currentPage === page ? "page" : undefined}
                      className={[
                        "inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium shadow-sm transition",
                        currentPage === page
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                      ].join(" ")}
                    >
                      {page}  
                    </button>
                  )
                )}
              </div>

              <button
                onClick={handleNext}
                disabled={!pagination.hasNextPage}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>

            <div className="w-40">
              <label htmlFor="itemsPerPage" className="sr-only">
                Items per page
              </label>
              <select
                id="itemsPerPage"
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                className="h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 shadow-sm focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="10">10 / page</option>
                <option value="25">25 / page</option>
                <option value="50">50 / page</option>
                <option value="100">100 / page</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type TaskRowProps = {
  task: Task;
  expandedTaskId: string | null;
  setExpandedTaskId: React.Dispatch<React.SetStateAction<string | null>>;
};

function TaskRow({ task, expandedTaskId, setExpandedTaskId }: TaskRowProps) {
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

  const { data, isLoading, isError } = useQuery({
    queryKey: ["task-details", lookupId],
    queryFn: () => tasksApi.getTaskDetails(lookupId),
    enabled: isExpanded,
    staleTime: 5 * 60 * 1000,
  });

  const details = Array.isArray(data?.details) ? data.details : [];
  const firstDetail = details[0]?.text ?? "";
  const countLabel =
    typeof task.detailsCount === "number" ? task.detailsCount : details.length;

  const formatDate = (dateString?: string) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "to-do":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-600";
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

    // Validate time format HH:MM
    if (!/^\d{2}:\d{2}$/.test(editTime)) {
      setEditError("Time must be in HH:MM format");
      return;
    }

    // Validate time ranges
    const [hours, minutes] = editTime.split(":").map(Number);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      setEditError("Time must be in HH:MM format and a valid time");
      return;
    }

    setEditLoading(true);
    try {
      await tasksApi.updateTaskDetail(
        task._id,
        editingDetailIndex!,
        editText.trim(),
        editTime
      );

      // Invalidate the query to refetch details
      queryClient.invalidateQueries({ queryKey: ["task-details", lookupId] });

      handleCancelEdit();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to update detail";
      setEditError(message);
    } finally {
      setEditLoading(false);
    }
  };

  const getNextStatus = (currentStatus?: string): "to-do" | "in-progress" | "completed" => {
    if (currentStatus === "to-do") return "in-progress";
    if (currentStatus === "in-progress") return "completed";
    return "to-do";
  };

  const handleStatusChange = async (newStatus: "to-do" | "in-progress" | "completed") => {
    setUpdatingStatus(true);
    try {
      await tasksApi.updateTaskStatus(task._id, newStatus);
      // Invalidate queries to refresh task list
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      setStatusDropdownOpen(false);
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleNextStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus = getNextStatus(task.status);
    await handleStatusChange(nextStatus);
  };

  const handleMarkCompleted = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await handleStatusChange("completed");
  };

  return (
    <>
      <tr
        onClick={() => setExpandedTaskId(isExpanded ? null : task._id)}
        className="cursor-pointer transition hover:bg-gray-50"
      >
        <td className="whitespace-nowrap px-4 py-3 align-top text-gray-500">
          {task.no || "—"}
        </td>

        <td className="px-4 py-3 align-top font-medium text-gray-900">
          {task.taskName}
        </td>

        <td className="px-4 py-3 align-top text-gray-700">
          {task.projectName || "—"}
        </td>

        <td className="px-4 py-3 align-top" onClick={(e) => e.stopPropagation()}>
          <div className="relative inline-block">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
                disabled={updatingStatus}
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-all ${getStatusBadgeClass(task.status)} ${updatingStatus ? "opacity-50 cursor-not-allowed" : "hover:opacity-80 cursor-pointer"}`}
              >
                <span>{task.status || "to-do"}</span>
              </button>
              
              <button
                onClick={handleNextStatus}
                disabled={updatingStatus}
                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Next: ${getNextStatus(task.status)}`}
              >
                <svg className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>

              <button
                onClick={handleMarkCompleted}
                disabled={updatingStatus || task.status === "completed"}
                className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-green-200 hover:bg-green-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Mark as Completed"
              >
                <svg className="w-3 h-3 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            </div>

            {statusDropdownOpen && (
              <div className="absolute z-20 mt-1 w-32 rounded-lg border border-gray-200 bg-white shadow-lg">
                <button
                  onClick={() => handleStatusChange("to-do")}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                >
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-800">
                    to-do
                  </span>
                </button>
                <button
                  onClick={() => handleStatusChange("in-progress")}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                >
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800">
                    in-progress
                  </span>
                </button>
                <button
                  onClick={() => handleStatusChange("completed")}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors"
                >
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
                    completed
                  </span>
                </button>
              </div>
            )}
          </div>
        </td>

        <td className="px-4 py-3 align-top">
          <div className="flex flex-col">
            <span className="font-medium text-gray-900">{firstDetail || "—"}</span>
            {countLabel > 1 ? (
              <span className="text-xs text-gray-500">
                {countLabel} items • click to expand
              </span>
            ) : (
              <span className="text-xs text-gray-400">click to expand</span>
            )}
          </div>
        </td>

        <td className="whitespace-nowrap px-4 py-3 align-top text-gray-700">
          {task.hours}
        </td>

        <td className="whitespace-nowrap px-4 py-3 align-top text-gray-700">
          {formatDate(task.dueDate)}
        </td>
      </tr>

      {isExpanded && (
        <tr>
          <td colSpan={7} className="bg-gray-50 px-4 py-5">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900">
                    {task.taskName}
                  </h3>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Total Hours: </span>
                      <span className="font-medium text-gray-900">{task.hours}h</span>
                    </div>
                    {task.projectName && (
                      <div>
                        <span className="text-gray-600">Project: </span>
                        <span className="font-medium text-gray-900">{task.projectName}</span>
                      </div>
                    )}
                    {task.startDate && task.dueDate && (
                      <div>
                        <span className="text-gray-600">Remaining: </span>
                        <span className="font-medium text-gray-900">
                          {(() => {
                            const start = new Date(task.startDate);
                            const due = new Date(task.dueDate);
                            const today = new Date();
                            const totalDays = Math.ceil((due.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                            const remainingDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                            
                            if (remainingDays < 0) {
                              return <span className="text-red-600">{Math.abs(remainingDays)} days overdue</span>;
                            } else if (remainingDays === 0) {
                              return <span className="text-orange-600">Due today</span>;
                            } else {
                              return <span className={remainingDays <= 3 ? "text-orange-600" : "text-green-600"}>
                                {remainingDays} of {totalDays} days
                              </span>;
                            }
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedTaskId(null);
                  }}
                  className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
                >
                  Close
                </button>
              </div>

              {isLoading ? (
                <div className="text-sm text-gray-500">Loading details…</div>
              ) : isError ? (
                <div className="text-sm text-red-600">Failed to load details.</div>
              ) : details.length === 0 ? (
                <div className="text-sm text-gray-500">No details available.</div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {details.map((d, i) => {
                    const theme = stickyNoteThemes[i % stickyNoteThemes.length];
                    const isEditing = editingDetailIndex === i;

                    return isEditing ? (
                      <div
                        key={`${task._id}-detail-edit-${i}`}
                        className="relative rounded-3xl border-2 border-blue-300 bg-white p-6 shadow-md"
                      >
                        <div className="flex flex-col gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Detail text
                            </label>
                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg p-2 text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                              rows={3}
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Time (HH:MM)
                            </label>
                            <input
                              type="text"
                              value={editTime}
                              onChange={(e) => setEditTime(e.target.value)}
                              placeholder="00:00"
                              className="w-full border border-gray-300 rounded-lg p-2 text-black text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                          </div>

                          {editError && (
                            <p className="text-sm text-red-600">{editError}</p>
                          )}

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleSaveEdit}
                              disabled={editLoading}
                              className="flex-1 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400"
                            >
                              {editLoading ? "Saving..." : "Save"}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={editLoading}
                              className="flex-1 rounded-lg border border-gray-300 bg-white text-gray-700 px-3 py-2 text-sm font-medium hover:bg-gray-50 disabled:bg-gray-100"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        key={`${task._id}-detail-${i}`}
                        className={[
                          "relative h-56 w-full overflow-hidden",
                          "rounded-3xl shadow-md",
                          "p-6",
                          theme.card,
                        ].join(" ")}
                      >
                        {/* Top right star button */}
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-neutral-900/90 text-white shadow-sm transition hover:bg-neutral-900"
                          aria-label="Favorite"
                          title="Favorite"
                        >
                          ★
                        </button>

                        {/* Main text */}
                        <p
                          className={[
                            "pr-14 text-lg font-semibold leading-snug",
                            theme.text,
                          ].join(" ")}
                        >
                          {d.text}
                        </p>

                        {/* Bottom-left time/date */}
                        <div className="absolute bottom-5 left-6">
                          <span
                            className={[
                              "text-sm font-medium opacity-80",
                              theme.text,
                            ].join(" ")}
                          >
                            {d.time}
                          </span>
                        </div>

                        {/* Bottom-right edit button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditDetail(i, { ...d, time: d.time || "00:00" });
                          }}
                          className="absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-neutral-900/90 text-white shadow-sm transition hover:bg-neutral-900"
                          aria-label="Edit"
                          title="Edit"
                        >
                          ✎
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}