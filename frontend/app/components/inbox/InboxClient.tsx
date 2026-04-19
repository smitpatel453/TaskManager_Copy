"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { inboxApi, type InboxMessage } from "../../../src/api/inbox.api";


export default function InboxClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<"all" | "tasks" | "mention" | "comment_reply">("all");
  const [replyText, setReplyText] = useState<{ [key: string]: string }>({});
  const queryClient = useQueryClient();

  // Fetch inbox messages with filter
  const { data: inboxData, isLoading } = useQuery({
    queryKey: ["inbox-messages", activeFilter],
    queryFn: () => inboxApi.getMessages(100, 0, activeFilter),
    staleTime: 30 * 1000, // Refresh every 30 seconds
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (messageId: string) => inboxApi.markMessageAsRead(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-messages", activeFilter] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: () => inboxApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-messages", activeFilter] });
    },
  });

  // Delete message mutation
  const deleteMessageMutation = useMutation({
    mutationFn: (messageId: string) => inboxApi.deleteMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-messages", activeFilter] });
    },
  });

  // Add reply mutation
  const addReplyMutation = useMutation({
    mutationFn: (data: { messageId: string; message: string }) => inboxApi.addReply(data.messageId, data.message),
    onSuccess: () => {
      // Invalidate all inbox queries (all filters) since replies can appear in multiple tabs
      queryClient.invalidateQueries({ queryKey: ["inbox-messages"] });
      setReplyText({});
    },
  });

  const messages = inboxData?.messages || [];
  const unreadCount = inboxData?.unreadCount || 0;

  const getStatusBadgeColor = (status: string | undefined) => {
    switch (status) {
      case "to-do":
        return "bg-gray-100 text-gray-800";
      case "in-progress":
        return "bg-blue-100 text-blue-800";
      case "completed":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case "task-assigned":
        return "📌";
      case "task-status-changed":
        return "✅";
      case "mention":
        return "@";
      case "comment_reply":
        return "💬";
      default:
        return "📧";
    }
  };

  const toggleExpanded = (messageId: string) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
      // Mark as read when expanded
      if (!messages.find((m) => m._id === messageId)?.isRead) {
        markAsReadMutation.mutate(messageId);
      }
    }
    setExpandedMessages(newExpanded);
  };

  const handleNavigateToTask = (message: InboxMessage) => {
    // Navigate to task page with filter and task ID
    const taskId = message.taskId || "";
    const taskName = message.taskName || "";
    router.push(`/dashboard/tasks?filter=assigned&taskId=${taskId}&scrollTo=${taskName}`);
  };

  // Auto-expand notification from query parameter (when clicked from toast)
  useEffect(() => {
    const expandNotificationId = searchParams.get("expandNotification");
    if (expandNotificationId && messages.length > 0) {
      const notification = messages.find(m => m._id === expandNotificationId);
      if (notification) {
        // Expand the notification
        setExpandedMessages(new Set([expandNotificationId]));

        // Scroll to the notification after a short delay
        setTimeout(() => {
          const element = document.getElementById(`notification-${expandNotificationId}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 300);
      }
    }
  }, [searchParams, messages]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
        <div className="animate-spin">⏳</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-canvas)]">
      {/* Inbox Header */}
      <div className="border-b border-[var(--border-default)] bg-[var(--bg-secondary)] px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">Inbox</h1>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              {messages.length} message{messages.length !== 1 ? "s" : ""} ({unreadCount} unread)
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
              className="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 text-sm font-medium transition-colors disabled:opacity-50"
            >
              {markAllAsReadMutation.isPending ? "Marking..." : "Mark all as read"}
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto border-b border-[var(--border-subtle)]">
          {(["all", "tasks", "mention", "comment_reply"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`pb-3 px-3 text-[12px] sm:text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeFilter === filter
                  ? "border-[var(--accent)] text-[var(--accent)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {filter === "all" && "All"}
              {filter === "tasks" && "Tasks"}
              {filter === "mention" && "Mentions"}
              {filter === "comment_reply" && "Replies"}
            </button>
          ))}
        </div>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
            <i className="pi pi-envelope text-5xl mb-3 opacity-50" />
            <p className="text-base">
              {activeFilter === "all" && "No messages yet"}
              {activeFilter === "tasks" && "No task notifications"}
              {activeFilter === "mention" && "No mentions"}
              {activeFilter === "comment_reply" && "No replies"}
            </p>
            <p className="text-sm">
              {activeFilter === "all" && "You will receive notifications about assigned tasks and status updates here."}
              {activeFilter === "tasks" && "Task assignments and status updates will appear here."}
              {activeFilter === "mention" && "When someone mentions you, you'll see it here."}
              {activeFilter === "comment_reply" && "When someone replies to a task comment, you'll see it here."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-default)]">
            {messages.map((message) => {
              const isExpanded = expandedMessages.has(message._id);
              const isUnread = !message.isRead;

              return (
                <div
                  id={`notification-${message._id}`}
                  key={message._id}
                  className={`border-l-4 transition-colors ${
                    isUnread ? "border-l-blue-500 bg-blue-500/5" : "border-l-transparent bg-[var(--bg-canvas)]"
                  }`}
                >
                  <div
                    onClick={() => toggleExpanded(message._id)}
                    className="px-6 py-4 cursor-pointer hover:bg-[var(--bg-surface-1)] transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="text-lg mt-1 flex-shrink-0">{getMessageIcon(message.type)}</div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-[var(--text-primary)]">{message.title}</h3>
                              {isUnread && (
                                <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">{message.message}</p>

                            {/* Task details preview */}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <span className="px-2 py-1 rounded bg-[var(--bg-surface-2)] text-[var(--text-secondary)] text-xs">
                                {message.taskName}
                              </span>
                              {message.type === "task-status-changed" && message.newStatus && (
                                <>
                                  <span className="text-xs text-[var(--text-muted)]">→</span>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(message.newStatus)}`}>
                                    {message.newStatus}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Date & Actions */}
                          <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <span className="text-xs text-[var(--text-muted)]">{formatDate(message.createdAt)}</span>
                            <div className="flex items-center gap-1">
                              {!isUnread && (
                                <i className="pi pi-envelope-open text-[14px] text-[var(--text-muted)]" />
                              )}
                              {isUnread && <i className="pi pi-envelope text-[14px] text-[var(--ck-blue)]" />}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] space-y-3">
                        <div className="bg-[var(--bg-surface-1)] rounded-lg p-3 space-y-2 text-sm">
                          <p className="text-[var(--text-primary)]">{message.message}</p>

                          {message.type === "task-status-changed" && (
                            <div className="flex items-center gap-2 text-[var(--text-muted)]">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(message.previousStatus)}`}>
                                {message.previousStatus}
                              </span>
                              <span>→</span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadgeColor(message.newStatus)}`}>
                                {message.newStatus}
                              </span>
                            </div>
                          )}

                          {message.senderId && (
                            <div className="text-xs text-[var(--text-muted)]">
                              From: <strong>{message.senderId.firstName} {message.senderId.lastName}</strong> ({message.senderId.email})
                            </div>
                          )}

                          <div className="text-xs text-[var(--text-muted)]">
                            {new Date(message.createdAt).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 pt-2">
                          {activeFilter !== "all" && isUnread && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsReadMutation.mutate(message._id);
                              }}
                              disabled={markAsReadMutation.isPending}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10 text-green-600 hover:bg-green-500/20 text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              <i className="pi pi-check" />
                              Mark as read
                            </button>
                          )}
                          {activeFilter !== "all" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMessageMutation.mutate(message._id);
                              }}
                              disabled={deleteMessageMutation.isPending}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-600 hover:bg-red-500/20 text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              <i className="pi pi-trash" />
                              Delete
                            </button>
                          )}
                          {(message.type === "task-assigned" || message.type === "task-status-changed") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNavigateToTask(message);
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 text-xs font-medium transition-colors"
                            >
                              <i className="pi pi-arrow-right" />
                              View Task
                            </button>
                          )}
                        </div>

                        {/* Replies Section - Only for comment replies, not in "all" section or mentions */}
                        {activeFilter !== "all" && message.type === "comment_reply" && message.replies && message.replies.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                            <h4 className="text-xs font-semibold text-[var(--text-muted)] uppercase mb-3">Replies ({message.replies.length})</h4>
                            <div className="space-y-2">
                              {message.replies.map((reply, idx) => (
                                <div key={idx} className="bg-[var(--bg-surface-2)] rounded-lg p-3 text-sm">
                                  <div className="flex items-start justify-between gap-2 mb-1">
                                    <strong className="text-[var(--text-primary)] text-xs">{reply.senderName}</strong>
                                    <span className="text-xs text-[var(--text-muted)]">{formatDate(reply.createdAt)}</span>
                                  </div>
                                  <p className="text-[var(--text-secondary)] text-xs">{reply.message}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Reply Input - Only for comment replies, not in "all" section or mentions */}
                        {activeFilter !== "all" && message.type === "comment_reply" && (
                          <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]" onClick={(e) => e.stopPropagation()}>
                            <form onSubmit={(e) => {
                              e.preventDefault();
                              if (replyText[message._id]?.trim()) {
                                addReplyMutation.mutate({
                                  messageId: message._id,
                                  message: replyText[message._id]
                                });
                              }
                            }} className="flex gap-2">
                              <input
                                type="text"
                                value={replyText[message._id] || ""}
                                onChange={(e) => setReplyText({...replyText, [message._id]: e.target.value})}
                                placeholder="Add a reply..."
                                disabled={addReplyMutation.isPending}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 px-3 py-1.5 bg-[var(--bg-surface-2)] border border-[var(--border-subtle)] rounded-lg text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] disabled:opacity-50"
                              />
                              <button
                                type="submit"
                                disabled={addReplyMutation.isPending || !replyText[message._id]?.trim()}
                                onClick={(e) => e.stopPropagation()}
                                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                              >
                                {addReplyMutation.isPending ? "Sending..." : "Reply"}
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
