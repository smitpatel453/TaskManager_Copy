"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { usersApi } from "../../../../src/api/users.api";
import type { User } from "../../../../src/types/user";
import { SkeletonUsersTable } from "../../../components/Skeleton";

export default function TeamMembersPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ["team-members", currentPage, itemsPerPage],
    queryFn: () => usersApi.getAllUsers(currentPage, itemsPerPage),
    staleTime: 5 * 60 * 1000,
  });

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
      {/* Breadcrumb + Header */}
      <div className="border-b border-[var(--border-subtle)] pb-0 md:-mx-6 md:px-6 -mt-6 pt-4 bg-[var(--bg-canvas)] px-4">
        <div className="flex items-center gap-2.5 mb-3 text-[var(--text-tertiary)] flex-wrap">
          <div className="w-4 sm:w-5 h-4 sm:h-5 rounded bg-violet-600 text-white flex items-center justify-center flex-shrink-0">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <span className="font-semibold text-[var(--text-primary)] text-[13px] sm:text-[16px]">All People</span>
        </div>

        <div className="flex items-center justify-between pb-3">
          <div className="text-[12px] text-[var(--text-secondary)]">
            Viewing {users.length} of {pagination.totalItems} people
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="mt-4 border border-[var(--border-subtle)] rounded-lg bg-[var(--bg-canvas)] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[500px] sm:min-w-full">
            {/* Table Header */}
            <div className="grid grid-cols-[1.5fr_3fr_1.5fr_1fr] gap-2 sm:gap-4 items-center px-3 sm:px-6 py-2 sm:py-2.5 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[10px] sm:text-[12px] font-semibold text-[var(--text-muted)] uppercase tracking-wide">
              <div>Name</div>
              <div>Email</div>
              <div>Role</div>
              <div>Created</div>
            </div>

            {/* Rows */}
            {isLoading ? (
              <SkeletonUsersTable rows={8} />
            ) : users.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <p className="text-sm text-[var(--text-tertiary)]">No people found</p>
              </div>
            ) : (
              users.map((user: User) => (
                <div
                  key={user._id}
                  className="grid grid-cols-[1.5fr_3fr_1.5fr_1fr] gap-2 sm:gap-4 items-center px-3 sm:px-6 py-2.5 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-surface)] text-[11px] sm:text-[13px] bg-[var(--bg-canvas)] transition-colors"
                >
                  {/* Name */}
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                      {user.firstName?.charAt(0)}{user.lastName?.charAt(0)}
                    </div>
                    <span className="truncate font-medium text-[var(--text-primary)]">
                      {user.firstName} {user.lastName}
                    </span>

                    {user.emailVerified ? (
                      <img
                        src="/verified-badge.svg"
                        alt="Verified"
                        className="w-4 h-4 flex-shrink-0"
                        title="Email verified"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-dashed border-[var(--text-muted)] flex-shrink-0" title="Email not verified" />
                    )}
                  </div>

                  {/* Email */}
                  <div className="min-w-0 truncate text-[var(--text-secondary)]">{user.email}</div>

                  {/* Role */}
                  <div className="min-w-0">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium ${
                      user.role === "admin"
                        ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    }`}>
                      {user.role?.charAt(0).toUpperCase()}{user.role?.slice(1) || "User"}
                    </span>
                  </div>

                  {/* Created Date */}
                  <div className="min-w-0 text-[var(--text-muted)]">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "N/A"}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pagination */}
      {users.length > 0 && (
        <div className="flex items-center justify-between px-2 py-4 text-[12px]">
          <div className="text-[var(--text-muted)]">
            Page {pagination.currentPage} of {pagination.totalPages}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={!pagination.hasPreviousPage}
              className="px-3 py-1.5 rounded border border-[var(--border-subtle)] hover:bg-[var(--nav-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!pagination.hasNextPage}
              className="px-3 py-1.5 rounded border border-[var(--border-subtle)] hover:bg-[var(--nav-hover-bg)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
