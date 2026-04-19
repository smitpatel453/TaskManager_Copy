"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SignupForm from "./auth/SignupForm";
import LoginForm from "./auth/LoginForm";

export default function WelcomePage() {
  const router = useRouter();
  const [view, setView] = useState<"welcome" | "login" | "signup">("welcome");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  if (view === "login") {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Welcome back
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Sign in to your workspace
            </p>
          </div>

          {/* Login Card */}
          <div className="ck-card p-8">
            <LoginForm />
          </div>

          <p className="text-center text-xs text-[var(--text-tertiary)] mt-6">
            Secure, collaborative task management
          </p>
        </div>
      </div>
    );
  }

  if (view === "signup") {
    return (
      <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Get Started
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Create your Task Manager account
            </p>
          </div>

          {/* Signup Card */}
          <div className="ck-card p-8">
            <SignupForm onSwitchToLogin={() => setView("login")} />
          </div>

          <p className="text-center text-xs text-[var(--text-tertiary)] mt-6">
            Secure, collaborative task management
          </p>
        </div>
      </div>
    );
  }

  // Welcome View
  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--bg-canvas)] via-[var(--bg-canvas)] to-[var(--bg-surface-1)] flex flex-col items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        {/* Logo/Title Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-6">
            <span className="text-3xl">✓</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text-primary)] mb-3">
            Welcome to Task Manager
          </h1>
          <p className="text-lg text-[var(--text-secondary)] mb-2">
            Organize, collaborate, and manage your projects efficiently
          </p>
          <p className="text-sm text-[var(--text-tertiary)]">
            Professional task management for teams and individuals
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
          <div className="ck-card p-6 text-center hover:border-blue-500/30 transition-colors">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-500/10 text-blue-500 mb-3">
              <span className="text-xl">📋</span>
            </div>
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">
              Easy Management
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Create and organize tasks with intuitive interface
            </p>
          </div>

          <div className="ck-card p-6 text-center hover:border-blue-500/30 transition-colors">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-green-500/10 text-green-500 mb-3">
              <span className="text-xl">👥</span>
            </div>
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">
              Team Collaboration
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Assign tasks and communicate with your team
            </p>
          </div>

          <div className="ck-card p-6 text-center hover:border-blue-500/30 transition-colors">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-purple-500/10 text-purple-500 mb-3">
              <span className="text-xl">🚀</span>
            </div>
            <h3 className="font-semibold text-[var(--text-primary)] mb-1">
              Real-time Updates
            </h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Get instant notifications and status updates
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => setView("signup")}
            className="claude-btn-primary px-8 py-3 flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <span>Get Started</span>
            <span className="text-lg">→</span>
          </button>
          <button
            onClick={() => setView("login")}
            className="px-8 py-3 rounded-lg border border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--bg-surface-1)] font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap"
          >
            <span>Sign In</span>
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <p className="text-xs text-[var(--text-tertiary)]">
            No credit card required • Free to get started
          </p>
        </div>
      </div>
    </div>
  );
}
