"use client";

import { useEffect, useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import TaskTable from "./TaskTable";

export default function TasksClient() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();

  const filterParam = useMemo(() => searchParams.get("filter") || "", [searchParams]);
  const projectParam = useMemo(() => searchParams.get("project") || "", [searchParams]);
  const assignedToParam = useMemo(() => searchParams.get("assignedTo") || "", [searchParams]);

  // Single effect to initialize auth state
  useEffect(() => {
    const userStr = localStorage.getItem("user");
    let isAdminUser = false;
    
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        isAdminUser = user.role === "admin";
      } catch {
        isAdminUser = false;
      }
    }
    
    setIsAdmin(isAdminUser);
    setIsLoggedIn(!!localStorage.getItem("token"));
    setIsLoading(false);
  }, []);

  // Handle auth state changes
  useEffect(() => {
    const handleAuthChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ isLoggedIn: boolean }>;
      const hasToken = customEvent.detail.isLoggedIn;
      setIsLoggedIn(hasToken);
      if (!hasToken) {
        queryClient.clear();
      }
    };

    window.addEventListener("authStateChanged", handleAuthChange);
    return () => window.removeEventListener("authStateChanged", handleAuthChange);
  }, [queryClient]);

  const getBreadcrumbLabel = () => {
    if (filterParam === "assigned") return "Assigned to me";
    if (filterParam === "created") return "Personal List";
    if (projectParam) return "Project Tasks";
    return "All Tasks";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex items-center gap-3 text-[var(--text-tertiary)]">
          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--bg-surface-2)] flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h3 className="text-xl font-medium text-[var(--text-primary)] mb-2">
          Please sign in
        </h3>
        <p className="text-[var(--text-secondary)] text-sm max-w-sm">
          You need to be logged in to view and manage your tasks.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Breadcrumb + View Tabs */}
      <div className="border-b border-[var(--border-subtle)] pb-0 -mx-6 px-6 -mt-6 pt-4 bg-[var(--bg-canvas)]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2.5 mb-3 text-[var(--text-tertiary)]">
          <div className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <span className="font-semibold text-[var(--text-primary)] text-[16px]">
            {projectParam ? (isAdmin ? "All Projects" : "My Projects") : "My Tasks"}
          </span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          <span className="font-semibold text-[var(--text-primary)] text-[16px]">{getBreadcrumbLabel()}</span>
        </div>

        {/* View Nav Tabs removed */}
      </div>

      {/* Task Table */}
      <div className="mt-4">
        <TaskTable 
          initialFilter={filterParam} 
          projectFilter={projectParam} 
          assignedToFilter={assignedToParam || undefined}
          readOnly={!filterParam && !projectParam}
        />
      </div>
    </div>
  );
}
