"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UsersClient from "../../components/users/UsersClient";

export default function UsersPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.role === "admin") {
          setIsAdmin(true);
        } else {
          router.push("/dashboard");  
        }
      } catch (error) {
        console.error("Error parsing user data:", error);
        router.push("/dashboard");
      }
    } else {
      router.push("/");
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!isAdmin) {
    return null;
  }

  return <UsersClient />;
}
