"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

/**
 * Rafraîchit les données quand les tables liées au pipeline stage/terrain changent.
 */
export function useSupabaseTableRefresh(
  tables: string[],
  onRefresh: () => void,
  enabled = true
): void {
  useEffect(() => {
    if (!enabled) return;
    const client = createSupabaseBrowserClient();
    if (!client) return;

    const channel = client
      .channel(`refresh-${tables.join("-")}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: tables[0]! },
        () => onRefresh()
      );

    for (let i = 1; i < tables.length; i++) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: tables[i]! },
        () => onRefresh()
      );
    }

    channel.subscribe();
    return () => {
      void client.removeChannel(channel);
    };
  }, [enabled, onRefresh, tables]);
}
