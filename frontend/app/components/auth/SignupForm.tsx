"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { authApi } from "../../../src/api/auth.api";

type PasswordRequirement = {
  label: string;
  regex: RegExp;
};

const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  { label: "Minimum 8 characters", regex: /.{8,}/ },
  { label: "At least one uppercase letter", regex: /[A-Z]/ },
  { label: "At least one lowercase letter", regex: /[a-z]/ },
  { label: "At least one number", regex: /[0-9]/ },
  { label: "At least one special character", regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/ },
];

export default function SignupForm({
  onSwitchToLogin,
}: {
  onSwitchToLogin: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [passwordStrength, setPasswordStrength] = useState<boolean[]>([
    false,
    false,
    false,
    false,
    false,
  ]);

  const getApiErrorMessage = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
      const data = err.response?.data as
        | { error?: string; message?: string }
        | undefined;
      return (
        data?.error || data?.message || err.message || fallback
      );
    }

    if (err instanceof Error) return err.message;
    return fallback;
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkPasswordStrength = (password: string): boolean[] => {
    return PASSWORD_REQUIREMENTS.map((req) => req.regex.test(password));
  };

  const isPasswordValid = (): boolean => {
    return passwordStrength.every((req) => req);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Update password strength when password field changes
    if (name === "password") {
      setPasswordStrength(checkPasswordStrength(value));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    // Validation
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

    if (!validateEmail(formData.email)) {
      setError("Invalid email format");
      return;
    }

    if (!formData.password) {
      setError("Password is required");
      return;
    }

    if (!isPasswordValid()) {
      setError("Password does not meet all requirements");
      return;
    }

    if (!formData.confirmPassword) {
      setError("Confirm password is required");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setIsLoading(true);
      const result = await authApi.signup(
        formData.firstName,
        formData.lastName,
        formData.email,
        formData.password,
        formData.confirmPassword
      );

      localStorage.setItem("token", result.data.token);

      const userData = {
        userId: result.data.userId,
        firstName: result.data.firstName,
        lastName: result.data.lastName,
        email: result.data.email,
        role: result.data.role,
        avatar: result.data.avatar,
        emailVerified: result.data.emailVerified,
      };

      localStorage.setItem("user", JSON.stringify(userData));

      // Dispatch auth events
      window.dispatchEvent(new CustomEvent("authChange"));
      window.dispatchEvent(
        new CustomEvent("authStateChanged", { detail: { isLoggedIn: true } })
      );

      router.push("/dashboard");
    } catch (error) {
      console.error("Signup error:", error);
      setError(getApiErrorMessage(error, "Signup failed"));
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
        {/* First Name & Last Name Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              First Name
            </label>
            <input
              type="text"
              name="firstName"
              id="firstName"
              placeholder="John"
              value={formData.firstName}
              onChange={handleInputChange}
              required
              className="claude-input w-full"
              aria-required={true}
            />
          </div>
          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
            >
              Last Name
            </label>
            <input
              type="text"
              name="lastName"
              id="lastName"
              placeholder="Doe"
              value={formData.lastName}
              onChange={handleInputChange}
              required
              className="claude-input w-full"
              aria-required={true}
            />
          </div>
        </div>

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
          >
            Email
          </label>
          <input
            type="email"
            name="email"
            id="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleInputChange}
            required
            className="claude-input w-full"
            aria-required={true}
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
          >
            Password
          </label>
          <input
            type="password"
            name="password"
            id="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleInputChange}
            required
            className="claude-input w-full"
            aria-required
          />

          {/* Password Requirements */}
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-[var(--text-secondary)]">
              Password Requirements:
            </p>
            <div className="space-y-1.5">
              {PASSWORD_REQUIREMENTS.map((req, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-xs transition-colors"
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      passwordStrength[idx]
                        ? "bg-green-500/20 text-green-600"
                        : "bg-[var(--bg-surface-2)] text-[var(--text-tertiary)]"
                    }`}
                  >
                    {passwordStrength[idx] ? (
                      <span className="text-[10px]">✓</span>
                    ) : (
                      <span className="text-[10px]">○</span>
                    )}
                  </div>
                  <span
                    className={
                      passwordStrength[idx]
                        ? "text-green-600"
                        : "text-[var(--text-tertiary)]"
                    }
                  >
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-[var(--text-secondary)] mb-2"
          >
            Confirm Password
          </label>
          <input
            type="password"
            name="confirmPassword"
            id="confirmPassword"
            placeholder="Re-enter your password"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            required
            className="claude-input w-full"
            aria-required
          />
          {formData.confirmPassword && formData.password !== formData.confirmPassword && (
            <p className="mt-1 text-xs text-[var(--status-error)]">Passwords do not match</p>
          )}
          {formData.confirmPassword && formData.password === formData.confirmPassword && (
            <p className="mt-1 text-xs text-green-600">Passwords match</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="claude-btn-primary w-full flex items-center justify-center gap-2 mt-6"
        >
          {isLoading ? (
            <>
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="mt-6 text-center">
        <p className="text-sm text-[var(--text-secondary)]">
          Already have an account?{" "}
          <button
            onClick={onSwitchToLogin}
            className="text-blue-500 hover:text-blue-600 font-medium transition-colors"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
