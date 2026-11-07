"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CaseView } from "@/lib/caseData";
import { browserDb } from "@/lib/db/browser";

/**
 * Keeps a case fresh: Supabase Realtime broadcast for instant updates, plus a
 * slow poll as a safety net if the live connection drops.
 */
export function useLiveCase(initial: CaseView, patientId: string) {
  const [view, setView] = useState(initial);
  const [live, setLive] = useState(false);
  const [error, setError] = useState(false);
  const inflight = useRef(false);

  const refresh = useCallback(async () => {
    if (inflight.current) return;
    inflight.current = true;
    try {
      const res = await fetch(`/api/cases/${initial.id}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(String(res.status));
      setView((await res.json()) as CaseView);
      setError(false);
    } catch {
      setError(true);
    } finally {
      inflight.current = false;
    }
  }, [initial.id]);

  useEffect(() => {
    const supabase = browserDb();
    const channels = [`case:${initial.id}`, `patient:${patientId}`].map(
      (topic) =>
        supabase
          .channel(topic)
          .on("broadcast", { event: "*" }, () => void refresh())
          .subscribe((status) => {
            if (status === "SUBSCRIBED") setLive(true);
          }),
    );
    const poll = setInterval(() => void refresh(), 15_000);
    return () => {
      clearInterval(poll);
      channels.forEach((c) => void supabase.removeChannel(c));
    };
  }, [initial.id, patientId, refresh]);

  return { view, refresh, live, error };
}
