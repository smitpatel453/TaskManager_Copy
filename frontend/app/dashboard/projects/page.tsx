"use client";

import ProjectsClient from "../../components/projects/ProjectsClient";
import { useEffect, useState } from "react";

export default function ProjectsPage() {
  const [userRole, setUserRole] = useState<"admin" | "user" | undefined>();

  useEffect(() => {
    const user = localStorage.getItem("user");
    if (user) {
      try {
        const userData = JSON.parse(user);
        // Validate role is one of the allowed values
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

  return <ProjectsClient userRole={userRole} />;
}
