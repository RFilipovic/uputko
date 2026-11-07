import { db } from "@/lib/db/server";
import { currentPatientId } from "@/lib/session";

export const jsonError = (status: number, error: string, message?: string) =>
  Response.json({ error, message }, { status });

/** Current demo patient, or null. */
export async function requirePatient(): Promise<string | null> {
  return currentPatientId();
}

/** Does this appointment belong to the current patient? Returns its case id. */
export async function ownsAppointment(
  patientId: string,
  appointmentId: string,
) {
  const { data } = await db()
    .from("appointments")
    .select("id, patient_id, referral_id, referrals(case_id)")
    .eq("id", appointmentId)
    .maybeSingle();
  if (!data || data.patient_id !== patientId) return null;
  const ref = data.referrals as unknown as { case_id: string } | null;
  return { caseId: ref?.case_id ?? null };
}
