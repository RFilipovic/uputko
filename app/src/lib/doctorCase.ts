import { checkDoctorToken } from "@/lib/doctorTokens";
import { db } from "@/lib/db/server";

/** Resolve a doctor link to its case (with patient location for ranking). */
export async function doctorCase(token: string) {
  const check = await checkDoctorToken(token);
  if (!check.ok) return { ok: false as const, reason: check.reason };
  const { data: c } = await db()
    .from("cases")
    .select("id, patient_id, status, patient_lat, patient_lng, patient_city, summary_json, target_role, urgency")
    .eq("id", check.caseId)
    .single();
  if (!c) return { ok: false as const, reason: "invalid" as const };
  return { ok: true as const, case: c, practitionerId: check.practitionerId, firstUse: check.firstUse };
}

/** Statuses after which the doctor's decision is already made. */
export const DECIDED = new Set([
  "referral_issued",
  "appointment_proposed",
  "appointment_confirmed",
  "reschedule_requested",
  "done",
  "closed",
]);

/** Specialties a demo booking can use (synthetic slots exist for these). */
export const BOOKABLE_SPECIALTIES = [
  "otorinolaringologija",
  "kardiologija",
  "neurologija",
  "oftalmologija",
  "dermatologija-i-venerologija",
  "ortopedija",
  "gastroenterologija",
  "interna-medicina",
  "pedijatrija",
  "ginekologija-i-opstetricija",
  "ultrazvuk",
  "urologija",
  "pulmologija",
  "endokrinologija",
  "reumatologija",
  "psihijatrija",
] as const;
