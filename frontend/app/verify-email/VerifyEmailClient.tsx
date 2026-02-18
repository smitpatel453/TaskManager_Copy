"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { authApi } from "../../src/api/auth.api";

type Status = "loading" | "success" | "error";

export default function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Verifying your email...");

  const getApiErrorMessage = (err: unknown, fallback: string) => {
    if (axios.isAxiosError(err)) {
      const data = err.response?.data as { error?: string; message?: string } | undefined;
      return data?.error || data?.message || err.message || fallback;
    }
    if (err instanceof Error) return err.message;
    return fallback;
  };

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    let isMounted = true;

    authApi
      .verifyEmail(token)
      .then((result) => {
        if (!isMounted) return;
        setStatus("success");
        setMessage(result.message || "Email verified successfully.");
      })
      .catch((error) => {
        if (!isMounted) return;
        setStatus("error");
        setMessage(getApiErrorMessage(error, "Verification failed."));
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  return (
    <div className="min-h-screen bg-[var(--bg-canvas)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="ck-card p-8 text-center">
          <div className="mb-4">
            {status === "loading" && (
              <div className="mx-auto h-10 w-10 rounded-full border-4 border-[var(--border-subtle)] border-t-blue-600 animate-spin" />
            )}
            {status === "success" && (
              <div className="mx-auto flex items-center justify-center gap-2">
                <div className="h-10 w-10 rounded-full bg-gray-700 text-white flex items-center justify-center text-lg font-semibold">
                  u
                </div>
                <div className="flex items-center gap-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span className="text-green-500 font-semibold">Verified</span>
                </div>
              </div>
            )}
            {status === "error" && (
              <div className="mx-auto h-10 w-10 rounded-full bg-red-100 text-red-700 flex items-center justify-center">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
            )}
          </div>

          <h1 className="text-xl font-semibold text-[var(--text-primary)]">Email Verification</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{message}</p>
        </div>
      </div>
    </div>
  );
}
