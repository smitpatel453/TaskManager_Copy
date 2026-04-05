"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { usersApi } from "../../../src/api/users.api";
import type { User, CreateUserRequest } from "../../../src/types/user";
import { SkeletonUsersTable } from "../Skeleton";


export default function UsersClient() {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Inline add state
  const [isAdding, setIsAdding] = useState(false);
  const [newFirstName, setNewFirstName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);

  const firstNameRef = useRef<HTMLInputElement>(null);
  const roleDropdownRef = useRef<HTMLDivElement>(null);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["users", currentPage, itemsPerPage],
    queryFn: () => usersApi.getAllUsers(currentPage, itemsPerPage),
    staleTime: 5 * 60 * 1000,
  });

  const deleteUserMutation = useMutation({
    mutationFn: usersApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || "Failed to delete user");
    },
  });

  const createUserMutation = useMutation({
    mutationFn: usersApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setIsAdding(false);
      setNewFirstName("");
      setNewLastName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("user");
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || "Failed to create user");
    },
  });

  const handleCreateUser = () => {
    if (!newFirstName.trim() || !newLastName.trim()) {
      alert("First and Last name are required");
      return;
    }
    if (!newEmail.trim()) {
      alert("Email is required");
      return;
    }

    // Email format validation
    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(newEmail.trim())) {
      alert("Please enter a valid email address");
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    createUserMutation.mutate({
      firstName: newFirstName,
      lastName: newLastName,
      email: newEmail,
      password: newPassword,
      role: newRole,
    });
  };

  const handleDelete = (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this user?")) {
      deleteUserMutation.mutate(userId);
    }
  };

  // Click outside handler for role dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleDropdownRef.current && !roleDropdownRef.current.contains(event.target as Node)) {
        setRoleDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isAdding && firstNameRef.current) {
      firstNameRef.current.focus();
    }
  }, [isAdding]);

  const users = usersData?.data || [];
  const pagination = usersData?.pagination || {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 50,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  return (
    <div className="space-y-0">
      {/* Breadcrumb + View Tabs */}
      <div className="border-b border-[var(--border-subtle)] pb-0 md:-mx-6 md:px-6 -mt-6 pt-4 bg-[var(--bg-canvas)] px-4">
        <div className="flex items-center gap-2.5 mb-3 text-[var(--text-tertiary)] flex-wrap">
          <div className="w-4 sm:w-5 h-4 sm:h-5 rounded bg-violet-600 text-white flex items-center justify-center flex-shrink-0">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <span className="font-semibold text-[var(--text-primary)] text-[13px] sm:text-[16px]">User Management</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 text-[13px] text-[var(--text-tertiary)] font-medium" />

          <div className="flex items-center gap-3 pb-3">
            {/* Add User button removed */}
          </div>
        </div>
      </div>



      {/* Users Table */}
      <div className="mt-4 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-canvas)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[500px] sm:min-w-full">
            {/* Table Header */}
            <div className="grid grid-cols-[2fr_2fr_1fr_1.2fr_35px] gap-2 sm:gap-4 items-center px-3 sm:px-6 py-2 sm:py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[10px] sm:text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
              <div>Name</div>
              <div>Email</div>
              <div>Role</div>
              <div>Created</div>
              <div></div>
            </div>

            {/* Rows */}
            {isLoading ? (
              <SkeletonUsersTable rows={8} />
            ) : users.length === 0 && !isAdding ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="text-sm text-[var(--text-tertiary)] mb-4">No users found</p>
                <button
                  onClick={() => setIsAdding(true)}
                  className="ck-btn-primary flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  Create User
                </button>
              </div>
            ) : (
              users.map((user: User) => (
                <div
                  key={user._id}
                  className="grid grid-cols-[2fr_2fr_1fr_1.2fr_35px] gap-2 sm:gap-4 items-center px-3 sm:px-6 py-2 sm:py-2.5 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-surface)] group text-[11px] sm:text-[13px] bg-[var(--bg-canvas)] transition-colors"
                >
                  {/* Name */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-gray-700 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="truncate font-medium text-[var(--text-primary)] block">{user.firstName} {user.lastName}</span>
                    </div>
                    {user.emailVerified ? (
                      <img src="/verified-badge.svg" alt="Verified" className="w-4 h-4 flex-shrink-0" title="Email Verified" />
                    ) : null}
                  </div>

                  {/* Email */}
                  <div className="text-[11px] sm:text-[13px] text-[var(--text-secondary)] truncate">
                    {user.email}
                  </div>

                  {/* Role */}
                  <div>
                    <span
                      className={`inline-flex items-center rounded px-2 sm:px-2.5 py-0.5 text-[9px] sm:text-[11px] font-bold tracking-wide ${user.role === "admin"
                        ? "bg-violet-500 text-white"
                        : "bg-[#00b884] text-white"
                        }`}
                    >
                      {user.role.toUpperCase()}
                    </span>
                  </div>

                  {/* Created */}
                  <div className="text-[11px] sm:text-[13px] text-[var(--text-secondary)]">
                    {new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-center">
                    <button
                      onClick={(e) => handleDelete(user._id, e)}
                      className="text-[var(--text-muted)] hover:text-[var(--status-error)] transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                      title="Delete user"
                    >
                      <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Inline Add User */}
            {isAdding ? (
              <div className="grid grid-cols-[2fr_2fr_1fr_1.2fr_35px] gap-2 sm:gap-4 items-center px-3 sm:px-6 py-2 sm:py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-canvas)]">
                <div className="flex items-center gap-1 sm:gap-2">
                  <input
                    ref={firstNameRef}
                    type="text"
                    value={newFirstName}
                    onChange={(e) => setNewFirstName(e.target.value)}
                    placeholder="First Name"
                    className="flex-1 bg-transparent outline-none text-[11px] sm:text-[13px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--border-subtle)] rounded-md px-2 py-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateUser()}
                  />
                  <input
                    type="text"
                    value={newLastName}
                    onChange={(e) => setNewLastName(e.target.value)}
                    placeholder="Last Name"
                    className="flex-1 bg-transparent outline-none text-[11px] sm:text-[13px] font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] border border-[var(--border-subtle)] rounded-md px-2 py-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateUser()}
                  />
                </div>

                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Email"
                  className="bg-transparent outline-none text-[11px] sm:text-[12px] text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] border border-[var(--border-subtle)] rounded-md px-2 py-1 w-full"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateUser()}
                />

                <div className="flex items-center gap-1 sm:gap-2">
                  <div className="relative flex-1" ref={roleDropdownRef}>
                    <button
                      onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                      className={`w-full flex items-center justify-center rounded px-2 py-1 text-[9px] sm:text-[10px] font-bold tracking-wide cursor-pointer hover:opacity-80 transition-opacity ${newRole === "admin" ? "bg-violet-500 text-white" : "bg-[#00b884] text-white"}`}
                    >
                      {newRole.toUpperCase()}
                      <svg width="6" height="6" viewBox="0 0 24 24" fill="currentColor" className="ml-0.5 sm:ml-1"><path d="M7 10l5 5 5-5z" /></svg>
                    </button>
                    {roleDropdownOpen && (
                      <div className="absolute z-50 top-full left-0 mt-1 w-full rounded shadow-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] overflow-hidden">
                        <button onClick={() => { setNewRole("user"); setRoleDropdownOpen(false); }} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-surface)]">User</button>
                        <button onClick={() => { setNewRole("admin"); setRoleDropdownOpen(false); }} className="block w-full text-left px-3 py-1.5 text-xs hover:bg-[var(--bg-surface)]">Admin</button>
                      </div>
                    )}
                  </div>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Pass"
                    className="flex-1 bg-transparent outline-none text-[11px] sm:text-[12px] text-[var(--text-secondary)] placeholder:text-[var(--text-muted)] border border-[var(--border-subtle)] rounded-md px-2 py-1"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateUser()}
                  />
                </div>

                {/* Actions */}
                <div className="flex justify-center items-center gap-1.5 sm:gap-2">
                  <button
                    onClick={handleCreateUser}
                    disabled={createUserMutation.isPending}
                    className="text-green-600 hover:text-green-700 transition-colors"
                    title="Save User"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="sm:w-[18px] sm:h-[18px]"><polyline points="20 6 9 17 4 12" /></svg>
                  </button>
                  <button
                    onClick={() => setIsAdding(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Cancel"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="sm:w-[18px] sm:h-[18px]"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                  </button>
                </div>
              </div>
            ) : (
              (users.length > 0 || isAdding) && (
                <button
                  onClick={() => { setIsAdding(true); setNewFirstName(""); setNewLastName(""); setNewEmail(""); setNewPassword(""); setNewRole("user"); }}
                  className="w-full flex items-center gap-2 px-8 py-3 text-[13px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-all border-t border-[var(--border-subtle)] rounded-b-lg"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                  Add User
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalItems > 0 && (
        <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-3">
            <span>
              Showing {(pagination.currentPage - 1) * pagination.itemsPerPage + 1}–
              {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} of {pagination.totalItems}
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
              onClick={() => { if (pagination.hasPreviousPage) setCurrentPage(p => p - 1); }}
              disabled={!pagination.hasPreviousPage}
              className="border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] px-2.5 py-1 rounded-md text-xs hover:bg-[var(--bg-surface)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-[var(--text-tertiary)]">
              Page {pagination.currentPage} of {pagination.totalPages}
            </span>
            <button
              onClick={() => { if (pagination.hasNextPage) setCurrentPage(p => p + 1); }}
              disabled={!pagination.hasNextPage}
              className="border border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] px-2.5 py-1 rounded-md text-xs hover:bg-[var(--bg-surface)] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
