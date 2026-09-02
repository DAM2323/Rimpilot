"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const interval = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(interval);
  }, [router]);
  return null;
}
