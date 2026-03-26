/**
 * Skeleton loading components — reusable shimmer placeholders.
 * All use the global `.skeleton` CSS class with the shimmer animation.
 */

import React from "react";

// ─── Base Skeleton ────────────────────────────────────────────────
interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ className = "", style }: SkeletonProps) {
  return <div className={`skeleton ${className}`} style={style} />;
}

// ─── Table Row Skeletons ──────────────────────────────────────────

/** Generic table row skeleton — n columns, configurable widths. */
export function SkeletonTableRow({
  cols = 4,
  colWidths,
}: {
  cols?: number;
  colWidths?: string[];
}) {
  return (
    <div className="flex items-center gap-4 px-6 py-3 border-b border-[var(--border-subtle)] animate-fade-in">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="flex items-center gap-2" style={{ flex: colWidths?.[i] ?? 1 }}>
          {i === 0 && <Skeleton className="skeleton-circle w-7 h-7 flex-shrink-0" />}
          <Skeleton className="skeleton-text" style={{ width: i === 0 ? "60%" : "80%" }} />
        </div>
      ))}
    </div>
  );
}

/** Users table skeleton — matches the users table layout */
export function SkeletonUsersTable({ rows = 6 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_200px_100px_120px_40px] gap-2 items-center px-4 py-3 border-b border-[var(--border-subtle)]"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {/* Name */}
          <div className="flex items-center gap-3 pl-4">
            <Skeleton className="skeleton-circle w-7 h-7 flex-shrink-0" />
            <Skeleton className="skeleton-text" style={{ width: "55%" }} />
          </div>
          {/* Email */}
          <Skeleton className="skeleton-text" style={{ width: "80%" }} />
          {/* Role badge */}
          <Skeleton className="h-5 rounded" style={{ width: 48 }} />
          {/* Created */}
          <Skeleton className="skeleton-text" style={{ width: "60%" }} />
          {/* Actions */}
          <div />
        </div>
      ))}
    </div>
  );
}

/** Projects table skeleton */
export function SkeletonProjectsTable({ rows = 5 }: { rows?: number }) {
  return (
    <div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="grid grid-cols-[1fr_180px_160px_120px] gap-2 items-center px-4 py-3 border-b border-[var(--border-subtle)]"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          {/* Name */}
          <div className="flex items-center gap-3 pl-4">
            <Skeleton className="w-4 h-4 flex-shrink-0 rounded" />
            <Skeleton className="skeleton-text" style={{ width: "55%" }} />
          </div>
          {/* Created By */}
          <Skeleton className="skeleton-text" style={{ width: "70%" }} />
          {/* Assigned Users — avatar stack */}
          <div className="flex items-center -space-x-1.5">
            {[0, 1, 2].map((j) => (
              <Skeleton key={j} className="skeleton-circle w-6 h-6 border-2 border-[var(--bg-canvas)]" />
            ))}
          </div>
          {/* Created date */}
          <Skeleton className="skeleton-text" style={{ width: "60%" }} />
        </div>
      ))}
    </div>
  );
}

/** Tasks list skeleton */
export function SkeletonTasksList({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)]"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {/* Checkbox */}
          <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
          {/* Status badge */}
          <Skeleton className="h-5 rounded" style={{ width: 72 }} />
          {/* Task name */}
          <Skeleton className="skeleton-text flex-1" style={{ width: `${50 + Math.random() * 30}%` }} />
          {/* Assignee */}
          <Skeleton className="skeleton-circle w-6 h-6 flex-shrink-0" />
          {/* Due date */}
          <Skeleton className="skeleton-text" style={{ width: 64, flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}

/** Dashboard cards skeleton */
export function SkeletonDashboardCards() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)] overflow-hidden">
          {/* Card header */}
          <div className="px-4 py-2.5 border-b border-[var(--border-subtle)]">
            <Skeleton className="skeleton-text" style={{ width: "40%" }} />
          </div>
          <div className="px-4 py-4 space-y-4">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center gap-3">
                <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
                <Skeleton className="skeleton-text flex-1" />
                <Skeleton className="skeleton-lg" style={{ width: 32 }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Sidebar projects list skeleton */
export function SkeletonSidebarItems({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-0.5 px-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-2 px-2 py-2">
          <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
          <Skeleton
            className="skeleton-text flex-1"
            style={{ width: `${50 + (i % 3) * 15}%`, animationDelay: `${i * 80}ms` }}
          />
        </div>
      ))}
    </div>
  );
}
