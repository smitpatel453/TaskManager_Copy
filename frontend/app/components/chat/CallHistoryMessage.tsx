"use client";

import React from "react";

export interface CallHistoryMessageData {
  type: "voice" | "video";
  duration: number; // in seconds
  participants: Array<{
    _id: string;
    firstName: string;
    lastName: string;
  }>;
  initiatorId: string;
  status: "completed" | "missed" | "declined";
}

interface CallHistoryMessageProps {
  data: CallHistoryMessageData;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string | Date;
  isOwn: boolean;
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (minutes < 60) return `${minutes}m ${secs}s`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const getCallStatusText = (status: string): string => {
  switch (status) {
    case "completed":
      return "Call ended";
    case "missed":
      return "Missed call";
    case "declined":
      return "Call declined";
    default:
      return "Call";
  }
};

const getCallStatusColor = (status: string): string => {
  switch (status) {
    case "completed":
      return "text-green-600 dark:text-green-400";
    case "missed":
      return "text-red-600 dark:text-red-400";
    case "declined":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-blue-600 dark:text-blue-400";
  }
};

export function CallHistoryMessage({
  data,
  sender,
  createdAt,
  isOwn,
}: CallHistoryMessageProps) {
  const date = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  let timeText: string;
  if (diffMins < 1) timeText = "Just now";
  else if (diffMins < 60) timeText = `${diffMins}m ago`;
  else if (diffHours < 24) timeText = `${diffHours}h ago`;
  else if (diffDays < 7) timeText = `${diffDays}d ago`;
  else timeText = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const isMissed = data.status === "missed";
  const senderName = `${sender.firstName} ${sender.lastName}`;

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${
          isMissed
            ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
            : "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
        } max-w-xs`}
      >
        {/* Call Icon */}
        <div className={`flex-shrink-0 ${getCallStatusColor(data.status)}`}>
          {data.type === "video" ? (
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14l4-4v16z" />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          )}
        </div>

        {/* Call Details */}
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className={`text-[13px] font-semibold ${getCallStatusColor(data.status)}`}>
              {data.type === "video" ? "📹" : "☎️"} {getCallStatusText(data.status)}
            </span>
          </div>

          {/* Participants */}
          <p className="text-[12px] text-[var(--text-muted)]">
            {isOwn ? "You called" : `${senderName} called`}
            {data.participants.length > 0 && (
              <>
                {" "}
                {data.participants
                  .map((p) => `${p.firstName}`)
                  .join(", ")}
              </>
            )}
          </p>

          {/* Duration (only if completed) */}
          {data.status === "completed" && data.duration > 0 && (
            <p className="text-[12px] text-[var(--text-secondary)] font-medium">
              ⏱️ {formatDuration(data.duration)}
            </p>
          )}

          {/* Time */}
          <p className="text-[11px] text-[var(--text-muted)] mt-1">{timeText}</p>
        </div>

        {/* Call Type Badge */}
        <div className="flex-shrink-0">
          <span
            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
              data.type === "video"
                ? "bg-blue-200 dark:bg-blue-700 text-blue-700 dark:text-blue-200"
                : "bg-green-200 dark:bg-green-700 text-green-700 dark:text-green-200"
            }`}
          >
            {data.type}
          </span>
        </div>
      </div>
    </div>
  );
}

export default CallHistoryMessage;
