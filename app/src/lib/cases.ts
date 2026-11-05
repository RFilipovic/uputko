import { db, must } from "@/lib/db/server";
import type { Database, Json } from "@/lib/db/types";
import { broadcast, caseTopic } from "@/lib/realtime/broadcast";

export type CaseStatus = Database["public"]["Tables"]["cases"]["Row"]["status"];

/**
 * Record a case event (drives the timeline), optionally move the case to a new
 * status, and push it live to the patient's screen.
 */
export async function addCaseEvent(
  caseId: string,
  kind: string,
  payload: Record<string, unknown> = {},
  status?: CaseStatus,
) {
  if (status) {
    must(await db().from("cases").update({ status }).eq("id", caseId).select("id").single(), "case status");
  }
  const event = must(
    await db()
      .from("case_events")
      .insert({ case_id: caseId, kind, payload: payload as { [key: string]: Json } })
      .select("id, kind, payload, at")
      .single(),
    "case event",
  );
  await broadcast(caseTopic(caseId), "case_event", {
    id: event.id,
    kind: event.kind,
    payload: event.payload,
    at: event.at,
    status: status ?? null,
  });
  return event;
}
