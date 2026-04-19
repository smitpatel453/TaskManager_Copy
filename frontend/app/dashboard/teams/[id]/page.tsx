"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { api } from "@/src/api/http";
import Link from "next/link";
import { ArrowLeft, Users, Lock, Globe, Edit2, Trash2, Plus, X, LogOut, AlertTriangle, Mail } from "lucide-react";

interface TeamMember {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface Team {
  _id: string;
  teamName: string;
  description: string;
  isPrivate: boolean;
  members: TeamMember[];
  createdBy: TeamMember;
  createdAt: string;
  updatedAt: string;
}

interface UserData {
  userId: string;
  role: "admin" | "user";
}

/* ─── Toast System ──────────────────────────────────────────── */
type ToastType = "success" | "error" | "info";
interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

function ToastContainer({ toasts, remove }: { toasts: Toast[]; remove: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-[13px] font-medium border backdrop-blur-md animate-toast-in
            ${t.type === "success"
              ? "bg-emerald-950/90 border-emerald-700/50 text-emerald-200"
              : t.type === "error"
                ? "bg-red-950/90 border-red-700/50 text-red-200"
                : "bg-[#1e1f26]/90 border-[#36374a] text-gray-200"
            }`}
        >
          <span>
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}
          </span>
          <span>{t.message}</span>
          <button
            onClick={() => remove(t.id)}
            className="ml-2 opacity-60 hover:opacity-100 transition-opacity text-[11px]"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  const add = useCallback((message: string, type: ToastType = "info", duration = 3000) => {
    const id = ++counter.current;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), duration);
  }, []);
  const remove = useCallback((id: number) => setToasts((p) => p.filter((t) => t.id !== id)), []);
  return { toasts, add, remove };
}

/* ─── Confirmation Modal ──────────────────────────────────────── */
function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = "Delete",
  cancelText = "Cancel",
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-gray-200 animate-toast-in">
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            {isDangerous && <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-600 mt-1">{message}</p>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 transition-colors ${
                isDangerous
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {isLoading ? "Processing..." : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Add Member Modal ──────────────────────────────────────── */
function AddMemberModal({
  isOpen,
  isLoading = false,
  onSubmit,
  onCancel,
}: {
  isOpen: boolean;
  isLoading?: boolean;
  onSubmit: (userId: string) => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ userId: string; firstName: string; lastName: string; email: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch users as you type
  const handleEmailChange = async (value: string) => {
    setEmail(value);
    setSelectedUser(null);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (value.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    // Debounce search by 300ms
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSearching(true);
        const response = await api.get<{
          success: boolean;
          data: Array<{ userId: string; firstName: string; lastName: string; email: string }>;
        }>("/users/search", {
          params: { email: value },
        });
        setSearchResults(response.data.data || []);
      } catch (error) {
        console.error("Error searching users:", error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  };

  const handleSelectUser = (user: { userId: string; firstName: string; lastName: string; email: string }) => {
    setEmail(`${user.firstName} ${user.lastName}`);
    setSelectedUser(user.userId);
    setSearchResults([]);
  };

  const handleSubmit = () => {
    if (!selectedUser) {
      return;
    }
    onSubmit(selectedUser);
    setEmail("");
    setSelectedUser(null);
    setSearchResults([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading && selectedUser) {
      handleSubmit();
    }
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-gray-200 animate-toast-in">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Team Member</h2>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Member Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
              <input
                type="text"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type email to search..."
                disabled={isLoading}
                autoComplete="off"
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Start typing an email to search for users</p>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="mt-2 border border-gray-200 rounded-lg bg-white shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((user) => (
                  <button
                    key={user.userId}
                    onClick={() => handleSelectUser(user)}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <div className="font-medium text-sm text-gray-900">
                      {user.firstName} {user.lastName}
                    </div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </button>
                ))}
              </div>
            )}

            {isSearching && email.trim().length > 0 && searchResults.length === 0 && (
              <div className="mt-2 p-3 text-center text-sm text-gray-500">Searching...</div>
            )}

            {!isSearching && email.trim().length > 0 && searchResults.length === 0 && (
              <div className="mt-2 p-3 text-center text-sm text-gray-500">No users found</div>
            )}

            {selectedUser && (
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-900">
                ✓ User selected - click Add Member to confirm
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading || !selectedUser}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? "Adding..." : "Add Member"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TeamDetailPage() {
  const params = useParams();
  const teamId = params?.id as string;

  const [team, setTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ teamName: "", description: "", isPrivate: false });

  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [removeMemberModal, setRemoveMemberModal] = useState<{ open: boolean; memberId: string | null }>({ open: false, memberId: null });
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false);
  
  const { toasts, add: addToast, remove: removeToast } = useToast();

  // Get current user
  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setCurrentUser(JSON.parse(userData));
    }
  }, []);

  // Fetch team details
  useEffect(() => {
    if (!teamId) return;

    const fetchTeam = async () => {
      try {
        setLoading(true);
        const response = await api.get<{ success: boolean; data: Team }>(`/teams/${teamId}`);
        setTeam(response.data.data);
        setFormData({
          teamName: response.data.data.teamName,
          description: response.data.data.description,
          isPrivate: response.data.data.isPrivate,
        });
        setError(null);
      } catch (err: any) {
        console.error("Error fetching team:", err);
        if (err.response?.status === 404) {
          setError("Team not found");
        } else if (err.response?.status === 403) {
          setError("You don't have permission to view this team");
        } else {
          setError("Failed to load team details");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, [teamId]);

  // Check if current user is admin or creator
  const isAdmin = currentUser?.role === "admin";
  const isCreator = team?.createdBy._id === currentUser?.userId;
  const isMember = team?.members.some((m) => m._id === currentUser?.userId);
  const canManage = isAdmin || isCreator;

  // Handle update team
  const handleUpdateTeam = async () => {
    try {
      setActionLoading(true);
      await api.patch(`/teams/${teamId}`, formData);
      setTeam((prev) =>
        prev ? { ...prev, ...formData } : null
      );
      setEditMode(false);
      addToast("Team updated successfully", "success");
    } catch (err: any) {
      addToast(err.response?.data?.error || "Failed to update team", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle delete team
  const handleDeleteTeam = async () => {
    try {
      setActionLoading(true);
      await api.delete(`/teams/${teamId}`);
      addToast("Team deleted successfully", "success");
      setTimeout(() => {
        window.location.href = "/dashboard/teams";
      }, 1000);
    } catch (err: any) {
      addToast(err.response?.data?.error || "Failed to delete team", "error");
    } finally {
      setActionLoading(false);
      setDeleteModalOpen(false);
    }
  };

  // Handle remove member
  const handleRemoveMember = async () => {
    if (!removeMemberModal.memberId) return;

    try {
      setActionLoading(true);
      await api.delete(`/teams/${teamId}/members/${removeMemberModal.memberId}`);
      setTeam((prev) =>
        prev ? { ...prev, members: prev.members.filter((m) => m._id !== removeMemberModal.memberId) } : null
      );
      addToast("Member removed successfully", "success");
    } catch (err: any) {
      addToast(err.response?.data?.error || "Failed to remove member", "error");
    } finally {
      setActionLoading(false);
      setRemoveMemberModal({ open: false, memberId: null });
    }
  };

  // Handle add member
  const handleAddMember = async (userId: string) => {
    try {
      setActionLoading(true);
      await api.post(`/teams/${teamId}/members`, { memberId: userId });
      setAddMemberModalOpen(false);
      
      // Refetch team to get updated members list
      const response = await api.get<{ success: boolean; data: Team }>(`/teams/${teamId}`);
      setTeam(response.data.data);
      addToast("Member added successfully", "success");
    } catch (err: any) {
      addToast(err.response?.data?.error || "Failed to add member", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle leave team
  const handleLeaveTeam = async () => {
    try {
      setActionLoading(true);
      await api.post(`/teams/${teamId}/leave`);
      addToast("You have left the team", "success");
      setTimeout(() => {
        window.location.href = "/dashboard/teams";
      }, 1000);
    } catch (err: any) {
      addToast(err.response?.data?.error || "Failed to leave team", "error");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-10 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Link href="/dashboard/teams" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Teams
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-900 mb-2">Error</h2>
          <p className="text-red-700">{error}</p>
        </div>
        <ToastContainer toasts={toasts} remove={removeToast} />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="p-6">
        <Link href="/dashboard/teams" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Teams
        </Link>
        <div className="text-gray-500">Team not found</div>
        <ToastContainer toasts={toasts} remove={removeToast} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <Link href="/dashboard/teams" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Teams
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{team.teamName}</h1>
            {team.isPrivate ? (
              <Lock className="w-5 h-5 text-red-500" title="Private Team" />
            ) : (
              <Globe className="w-5 h-5 text-green-500" title="Public Team" />
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {canManage && (
            <>
              <button
                onClick={() => setEditMode(!editMode)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => setDeleteModalOpen(true)}
                disabled={actionLoading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          )}
          {isMember && !isCreator && (
            <button
              onClick={handleLeaveTeam}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              <LogOut className="w-4 h-4" />
              Leave
            </button>
          )}
        </div>
      </div>

      {/* Edit Mode */}
      {editMode && canManage && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Edit Team</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Team Name</label>
              <input
                type="text"
                value={formData.teamName}
                onChange={(e) => setFormData({ ...formData, teamName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isPrivate}
                  onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium text-gray-700">Private Team</span>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleUpdateTeam}
                disabled={actionLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Save Changes
              </button>
              <button
                onClick={() => setEditMode(false)}
                disabled={actionLoading}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      {team.description && !editMode && (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h2 className="text-sm font-semibold text-gray-600 mb-2">Description</h2>
          <p className="text-gray-700">{team.description}</p>
        </div>
      )}

      {/* Team Info */}
      {!editMode && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-600 mb-1">Created By</h3>
            <p className="text-gray-700">
              {team.createdBy.firstName} {team.createdBy.lastName}
            </p>
            <p className="text-sm text-gray-500">{team.createdBy.email}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-semibold text-gray-600 mb-1">Team Type</h3>
            <p className="text-gray-700">{team.isPrivate ? "Private" : "Public"}</p>
            <p className="text-sm text-gray-500">
              {team.isPrivate ? "Only members can access" : "All users can access"}
            </p>
          </div>
        </div>
      )}

      {/* Members */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Team Members ({team.members.length})</h2>
          </div>
          {canManage && (
            <button
              onClick={() => setAddMemberModalOpen(true)}
              disabled={actionLoading}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add Member
            </button>
          )}
        </div>

        {team.members.length === 0 ? (
          <p className="text-gray-500">No members in this team yet</p>
        ) : (
          <div className="space-y-2">
            {team.members.map((member) => (
              <div key={member._id} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{member.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {member._id === team.createdBy._id && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Creator</span>
                  )}
                  {canManage && member._id !== team.createdBy._id && (
                    <button
                      onClick={() => setRemoveMemberModal({ open: true, memberId: member._id })}
                      disabled={actionLoading}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50"
                      title="Remove member"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="text-xs text-gray-500 pt-4 border-t">
        <p>Created: {new Date(team.createdAt).toLocaleDateString()}</p>
        <p>Updated: {new Date(team.updatedAt).toLocaleDateString()}</p>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        title="Delete Team"
        message="Are you sure you want to delete this team? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={actionLoading}
        onConfirm={handleDeleteTeam}
        onCancel={() => setDeleteModalOpen(false)}
      />

      {/* Remove Member Confirmation Modal */}
      <ConfirmationModal
        isOpen={removeMemberModal.open}
        title="Remove Member"
        message="Are you sure you want to remove this member from the team?"
        confirmText="Remove"
        cancelText="Cancel"
        isDangerous={true}
        isLoading={actionLoading}
        onConfirm={handleRemoveMember}
        onCancel={() => setRemoveMemberModal({ open: false, memberId: null })}
      />

      {/* Add Member Modal */}
      <AddMemberModal
        isOpen={addMemberModalOpen}
        isLoading={actionLoading}
        onSubmit={handleAddMember}
        onCancel={() => setAddMemberModalOpen(false)}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} remove={removeToast} />
    </div>
  );
}
