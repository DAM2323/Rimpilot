"use client";

import { createClient } from "@supabase/supabase-js";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LiveRefresh() {
  const router = useRouter();
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return;
    const client = createClient(url, key);
    const channel = client.channel("rimpilot-movimientos").on("postgres_changes", { event: "*", schema: "public", table: "movimientos" }, () => router.refresh()).subscribe();
    return () => { void client.removeChannel(channel); };
  }, [router]);
  return null;
}
