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
  status: "completed" | "missed" | "rejected";
  endedBy?: string; // Who ended the call (ID)
  endedByName?: string; // Full name of who ended the call
}

interface CallHistoryMessageProps {
  data: CallHistoryMessageData;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  currentUserId?: string;
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

/**
 * Generate context-aware call message based on status and user role
 * WhatsApp-style call history display
 */
const generateCallMessage = (
  data: CallHistoryMessageData,
  sender: { _id: string; firstName: string; lastName: string },
  currentUserId?: string
): string => {
  const callerName = sender.firstName;
  
  // Find actual receiver (could be from participants or endedBy for rejected calls)
  let receiverId = data.participants.find((p) => p._id !== data.initiatorId)?._id;
  let receiverName = data.participants.find((p) => p._id !== data.initiatorId)?.firstName;
  
  // For rejected calls, if receiver not in participants, they must be the one who ended it
  if (data.status === "rejected" && !receiverId && data.endedBy) {
    receiverId = data.endedBy;
    receiverName = data.endedByName || "Someone"; // Use endedByName if available
  }

  const isCurrentUserCaller = currentUserId === data.initiatorId;
  const isCurrentUserReceiver = currentUserId === receiverId;

  // MISSED CALL
  if (data.status === "missed") {
    if (isCurrentUserCaller) {
      return "Call not answered";
    } else if (isCurrentUserReceiver) {
      return `You missed a call from ${callerName}`;
    } else {
      return `${callerName} missed a call`;
    }
  }

  // REJECTED/DECLINED CALL
  if (data.status === "rejected") {
    if (isCurrentUserCaller) {
      return `${receiverName || "Someone"} declined your call`;
    } else if (isCurrentUserReceiver) {
      return "You declined the call";
    } else {
      return `${receiverName || "Someone"} declined call from ${callerName}`;
    }
  }

  // COMPLETED CALL
  if (data.status === "completed") {
    return data.type === "video" ? "Video call" : "Voice call";
  }

  // Fallback
  return "Call";
};

const getCallStatusColor = (status: string): string => {
  switch (status) {
    case "completed":
      return "text-green-600 dark:text-green-400";
    case "missed":
      return "text-red-600 dark:text-red-400";
    case "rejected":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-blue-600 dark:text-blue-400";
  }
};

const getCallStatusSmallText = (status: string, type: string): string => {
  switch (status) {
    case "completed":
      return type === "video" ? "Video call" : "Voice call";
    case "missed":
      return "Missed call";
    case "rejected":
      return "Call declined";
    default:
      return "Call";
  }
};

export function CallHistoryMessage({
  data,
  sender,
  currentUserId,
  createdAt,
  isOwn,
}: CallHistoryMessageProps) {
  // Guard: Only render if we have all required data
  if (!data?.initiatorId || !data?.type || !sender?.firstName) {
    console.warn("⚠️ CallHistoryMessage: Missing required data", { data, sender });
    return null; // Don't render empty message boxes
  }

  const callMessage = generateCallMessage(data, sender, currentUserId);

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
  const isRejected = data.status === "rejected";
  const backgroundColor =
    isMissed || isRejected
      ? "bg-red-50 dark:bg-red-900/20"
      : "bg-blue-50 dark:bg-blue-900/20";
  const borderColor =
    isMissed || isRejected
      ? "border-red-200 dark:border-red-800"
      : "border-blue-200 dark:border-blue-800";

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${backgroundColor} ${borderColor} max-w-xs`}
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
              {data.status === "missed" && "❌"}
              {data.status === "rejected" && "❌"}
              {data.status === "completed" && (data.type === "video" ? "🎥" : "☎️")}
              {" "}
              {getCallStatusSmallText(data.status, data.type)}
            </span>
          </div>

          {/* Context-aware message */}
          <p className="text-[12px] text-gray-700 dark:text-gray-300 font-medium">
            {callMessage}
          </p>

          {/* Duration (only if completed and > 0) */}
          {data.status === "completed" && data.duration > 0 && (
            <p className="text-[12px] text-gray-600 dark:text-gray-400 font-medium">
              ⏱️ {formatDuration(data.duration)}
            </p>
          )}

          {/* Time */}
          <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-1">{timeText}</p>
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
