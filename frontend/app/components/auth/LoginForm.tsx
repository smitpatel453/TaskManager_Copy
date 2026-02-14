"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { authApi } from "../../../src/api/auth.api";

type User = {
    firstName: string;
    lastName: string;
    email: string;
    role?: "admin" | "user";
};

export default function LoginForm() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [error, setError] = useState<string>("");
    const [isUpdatePasswordOpen, setIsUpdatePasswordOpen] = useState(false);
    const [passwordError, setPasswordError] = useState<string>("");
    const [passwordSuccess, setPasswordSuccess] = useState<string>("");
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const getApiErrorMessage = (err: unknown, fallback: string) => {
        if (axios.isAxiosError(err)) {
            const data = err.response?.data as { error?: string; message?: string } | undefined;
            return data?.error || data?.message || err.message || fallback;
        }

        if (err instanceof Error) return err.message;
        return fallback;
    };

    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Check for existing token on component mount
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            try {
                const storedUser = localStorage.getItem("user");
                if (storedUser) {
                    setUser(JSON.parse(storedUser));
                }
            } catch (error) {
                console.error("Invalid token:", error);
                localStorage.removeItem("token");
                localStorage.removeItem("user");
            }
        }
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };

        if (isDropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isDropdownOpen]);

    const openModal = () => {
        setIsOpen(true);
        setError("");
    };
    const closeModal = () => {
        setIsOpen(false);
        setError("");
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setUser(null);
        setIsDropdownOpen(false);
        window.dispatchEvent(new CustomEvent("authStateChanged", { detail: { isLoggedIn: false } }));
    };

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    const openUpdatePasswordModal = () => {
        setPasswordError("");
        setPasswordSuccess("");
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setIsUpdatePasswordOpen(true);
        setIsDropdownOpen(false);
    };

    const closeUpdatePasswordModal = () => {
        setIsUpdatePasswordOpen(false);
        setPasswordError("");
        setPasswordSuccess("");
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    };

    const handlePasswordFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setPasswordForm((prev) => ({ ...prev, [name]: value }));
    };

    const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setPasswordError("");
        setPasswordSuccess("");

        if (!passwordForm.currentPassword) {
            setPasswordError("Current password is required");
            return;
        }
        if (!passwordForm.newPassword) {
            setPasswordError("New password is required");
            return;
        }
        if (!passwordForm.confirmPassword) {
            setPasswordError("Confirm password is required");
            return;
        }
        if (passwordForm.newPassword.length < 6) {
            setPasswordError("New password must be at least 6 characters");
            return;
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError("New password and confirm password do not match");
            return;
        }

        try {
            setIsPasswordLoading(true);
            const result = await authApi.changePassword(
                passwordForm.currentPassword,
                passwordForm.newPassword,
                passwordForm.confirmPassword
            );
            setPasswordSuccess(result.message);
            setTimeout(() => {
                closeUpdatePasswordModal();
            }, 2000);
        } catch (error) {
            console.error("Password change error:", error);
            setPasswordError(getApiErrorMessage(error, "Failed to change password"));
        } finally {
            setIsPasswordLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError("");
        const formData = new FormData(e.currentTarget);
        const data = Object.fromEntries(formData.entries());

        const email = (data.email as string).trim();
        const password = (data.password as string);

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setError("Invalid email format");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }

        try {
            setIsLoading(true);
            const result = await authApi.login(email, password);

            localStorage.setItem("token", result.data.token);

            const userData = {
                firstName: result.data.firstName,
                lastName: result.data.lastName,
                email: result.data.email,
                role: result.data.role,
            };

            localStorage.setItem("user", JSON.stringify(userData));
            setUser(userData);
            window.dispatchEvent(new CustomEvent("authStateChanged", { detail: { isLoggedIn: true } }));

            closeModal();
            router.push("/dashboard");
        } catch (error) {
            console.error("Auth error:", error);
            setError(getApiErrorMessage(error, "Authentication failed"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            {/* Error Message */}
            {error && (
                <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                    <p className="text-sm text-[var(--status-error)]">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Email
                    </label>
                    <input
                        type="email"
                        name="email"
                        id="email"
                        placeholder="you@example.com"
                        required
                        className="claude-input w-full"
                        aria-required
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                        Password
                    </label>
                    <input
                        type="password"
                        name="password"
                        id="password"
                        placeholder="Enter your password"
                        required
                        className="claude-input w-full"
                        aria-required
                    />
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="claude-btn-primary w-full flex items-center justify-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            Signing in...
                        </>
                    ) : (
                        "Sign In"
                    )}
                </button>
            </form>

            {/* Update Password Modal */}
            {isUpdatePasswordOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="w-full max-w-md rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] p-6 shadow-xl">
                        <h2 className="mb-4 text-xl font-display font-semibold text-[var(--text-primary)]">Update Password</h2>

                        {passwordError && (
                            <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 p-3">
                                <p className="text-sm text-[var(--status-error)]">{passwordError}</p>
                            </div>
                        )}

                        {passwordSuccess && (
                            <div className="mb-4 rounded-lg bg-green-500/10 border border-green-500/20 p-3">
                                <p className="text-sm text-[var(--status-success)]">{passwordSuccess}</p>
                            </div>
                        )}

                        <form onSubmit={handlePasswordSubmit} className="space-y-4">
                            <input
                                type="password"
                                name="currentPassword"
                                placeholder="Current Password"
                                value={passwordForm.currentPassword}
                                onChange={handlePasswordFormChange}
                                required
                                disabled={isPasswordLoading}
                                className="claude-input w-full"
                            />

                            <input
                                type="password"
                                name="newPassword"
                                placeholder="New Password"
                                value={passwordForm.newPassword}
                                onChange={handlePasswordFormChange}
                                required
                                disabled={isPasswordLoading}
                                className="claude-input w-full"
                            />

                            <input
                                type="password"
                                name="confirmPassword"
                                placeholder="Confirm New Password"
                                value={passwordForm.confirmPassword}
                                onChange={handlePasswordFormChange}
                                required
                                disabled={isPasswordLoading}
                                className="claude-input w-full"
                            />

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeUpdatePasswordModal}
                                    className="claude-btn-secondary"
                                    disabled={isPasswordLoading}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isPasswordLoading}
                                    className="claude-btn-primary"
                                >
                                    {isPasswordLoading ? "Updating..." : "Update Password"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
