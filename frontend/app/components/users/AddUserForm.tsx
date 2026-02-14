"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usersApi } from "../../../src/api/users.api";
import type { CreateUserRequest } from "../../../src/types/user";

interface AddUserFormProps {
  onSuccess?: () => void;
}

export default function AddUserForm({ onSuccess }: AddUserFormProps) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateUserRequest>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "user",
  });
  const [error, setError] = useState("");

  const createUserMutation = useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setFormData({ firstName: "", lastName: "", email: "", password: "", role: "user" });
      setError("");
      onSuccess?.();
    },
    onError: (error: any) => {
      setError(error.response?.data?.error || "Failed to create user");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.firstName.trim()) {
      setError("First name is required");
      return;
    }

    if (!formData.lastName.trim()) {
      setError("Last name is required");
      return;
    }

    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }

    if (!formData.password || formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    const payload: CreateUserRequest = {
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      email: formData.email.trim(),
      password: formData.password,
      role: formData.role,
    };

    createUserMutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3">
          <p className="text-sm text-[var(--status-error)]">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="firstName" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            First Name
          </label>
          <input
            id="firstName"
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="claude-input w-full"
            placeholder="Enter first name"
          />
        </div>

        <div>
          <label htmlFor="lastName" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
            Last Name
          </label>
          <input
            id="lastName"
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="claude-input w-full"
            placeholder="Enter last name"
          />
        </div>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          className="claude-input w-full"
          placeholder="Enter email"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          className="claude-input w-full"
          placeholder="Enter password (min 6 characters)"
        />
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Role
        </label>
        <select
          id="role"
          value={formData.role}
          onChange={(e) => setFormData({ ...formData, role: e.target.value as "admin" | "user" })}
          className="claude-input w-full"
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={createUserMutation.isPending}
        className="claude-btn-primary w-full flex items-center justify-center gap-2"
      >
        {createUserMutation.isPending ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Creating...
          </>
        ) : (
          "Create User"
        )}
      </button>
    </form>
  );
}
