"use client";

import Sidebar from "../components/Sidebar";
import { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [userRole, setUserRole] = useState<"admin" | "user" | undefined>();
  const hasInitialized = useRef(false);
  const pathname = usePathname();

  // Channel pages need to fill full height with no extra padding
  const isChannelPage = pathname?.startsWith("/dashboard/channels/");

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

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
    } else {
      setUserRole("user");
    }
  }, []);

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-[var(--bg-canvas)] text-[13px] font-sans text-[var(--text-primary)] overflow-hidden">
      <Sidebar userRole={userRole} />
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-canvas)] relative overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          {isChannelPage ? (
            children
          ) : (
            <div className="h-full overflow-auto ck-scrollbar p-6">
              {children}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
