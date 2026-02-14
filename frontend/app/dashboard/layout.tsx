"use client";

import Sidebar from "../components/Sidebar";
import { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userRole, setUserRole] = useState<"admin" | "user" | undefined>();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.role === "admin" || userData.role === "user") {
          setUserRole(userData.role);
        } else {
          console.warn("Invalid role in user data:", userData.role);
          setUserRole("user");
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
      }
    }
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex h-screen w-full bg-[var(--bg-canvas)] text-[13px] font-sans text-[var(--text-primary)] overflow-hidden">
      <Sidebar userRole={userRole} />
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-canvas)] relative">
        {/* Main Content */}
        <main className="flex-1 overflow-auto ck-scrollbar">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
