"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { projectsApi } from "../../../src/api/projects.api";
import type { CreateProjectRequest } from "../../../src/types/project";

interface AddProjectFormProps {
  users: Array<{ _id: string; firstName: string; lastName: string; email: string; fullName: string }>;
  onSuccess?: () => void;
}

export default function AddProjectForm({ users, onSuccess }: AddProjectFormProps) {
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateProjectRequest>({
    projectName: "",
    projectDescription: "",
    assignedUsers: [],
    teamId: "",
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUserId(user.id || user._id);
      } catch { /* ignore */ }
    }
  }, []);

  const createProjectMutation = useMutation({
    mutationFn: projectsApi.createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setFormData({ projectName: "", projectDescription: "", assignedUsers: [], teamId: "" });
      setError("");
      onSuccess?.();
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || "Failed to create project");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.projectName.trim()) {
      setError("Project name is required");
      return;
    }

    if (!formData.projectDescription.trim()) {
      setError("Project description is required");
      return;
    }

    if (formData.assignedUsers.length === 0) {
      setError("Please select at least one user to assign to the project");
      return;
    }

    if (!formData.teamId.trim()) {
      setError("Team ID is required");
      return;
    }

    createProjectMutation.mutate(formData);
  };

  const toggleUser = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      assignedUsers: prev.assignedUsers.includes(userId)
        ? prev.assignedUsers.filter((id) => id !== userId)
        : [...prev.assignedUsers, userId],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
          <p className="text-sm text-[var(--status-error)]">{error}</p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Project Name
        </label>
        <input
          type="text"
          value={formData.projectName}
          onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
          className="claude-input w-full"
          placeholder="Enter project name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Project Description
        </label>
        <textarea
          value={formData.projectDescription}
          onChange={(e) => setFormData({ ...formData, projectDescription: e.target.value })}
          rows={3}
          className="claude-input w-full resize-none"
          placeholder="Enter project description"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Team ID
        </label>
        <input
          type="text"
          value={formData.teamId}
          onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
          className="claude-input w-full"
          placeholder="Enter team ID"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Assign Users <span className="text-[var(--status-error)]">*</span>
        </label>
        <div className="border border-[var(--border-subtle)] rounded-lg p-4 max-h-48 overflow-y-auto bg-[var(--bg-canvas)]">
          {users.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">No users available</p>
          ) : (
            <div className="space-y-2">
              {users
                .filter((user) => user._id !== currentUserId)
                .map((user) => (
                  <label key={user._id} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-[var(--bg-surface-2)] transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.assignedUsers.includes(user._id)}
                      onChange={() => toggleUser(user._id)}
                      className="w-4 h-4 rounded border-[var(--border-subtle)] text-[var(--accent)] focus:ring-[var(--accent)] focus:ring-offset-0"
                    />
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[var(--accent)]/10 text-[var(--accent)] text-xs font-medium flex items-center justify-center">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </div>
                      <span className="text-sm text-[var(--text-primary)]">
                        {user.fullName}
                      </span>
                      <span className="text-xs text-[var(--text-muted)]">
                        ({user.email})
                      </span>
                    </div>
                  </label>
                ))}
            </div>
          )}
        </div>
        {formData.assignedUsers.length > 0 ? (
          <p className="text-xs text-[var(--text-tertiary)] mt-2">
            {formData.assignedUsers.length} user{formData.assignedUsers.length !== 1 ? 's' : ''} selected
          </p>
        ) : (
          <p className="text-xs text-[var(--status-error)] mt-2">
            At least one user must be selected
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={createProjectMutation.isPending}
        className="claude-btn-primary w-full flex items-center justify-center gap-2"
      >
        {createProjectMutation.isPending ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Creating...
          </>
        ) : (
          "Create Project"
        )}
      </button>
    </form>
  );
}
