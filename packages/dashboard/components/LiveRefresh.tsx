"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const refreshWhenVisible = (): void => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const interval = window.setInterval(refreshWhenVisible, 5000);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", refreshWhenVisible); };
  }, [router]);
  return null;
}
