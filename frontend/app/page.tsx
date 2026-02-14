"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "./components/auth/LoginForm";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Welcome back</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Sign in to your workspace</p>
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
