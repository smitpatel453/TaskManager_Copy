"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import WelcomePage from "./components/WelcomePage";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/dashboard");
    }
  }, [router]);

  return <WelcomePage />;
}
