import { db } from "@/lib/db/server";

export const caseTopic = (caseId: string) => `case:${caseId}`;
export const patientTopic = (patientId: string) => `patient:${patientId}`;

/**
 * Push a live update to everyone listening on a topic (the patient's phone).
 * Uses Supabase Realtime Broadcast over HTTP; never throws — a missed live
 * update only means the screen refreshes on its next load.
 */
export async function broadcast(topic: string, event: string, payload: Record<string, unknown>) {
  try {
    const channel = db().channel(topic);
    await channel.httpSend(event, payload);
    await db().removeChannel(channel);
  } catch (err) {
    console.error("broadcast failed", topic, event, err instanceof Error ? err.message : err);
  }
}
