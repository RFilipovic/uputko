import { deliverNotification, emailConfirmed } from "@/lib/appointments";
import { addCaseEvent } from "@/lib/cases";
import { db } from "@/lib/db/server";
import { jsonError, requirePatient } from "@/lib/patientAuth";
import { hr } from "@/i18n/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/notifications/:id/(accept|decline) — answer an earlier-slot or reschedule offer. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string; action: string }> },
) {
  const { id, action } = await ctx.params;
  const patientId = await requirePatient();
  if (!patientId) return jsonError(401, "no_patient");
  const { data: n } = await db()
    .from("notifications")
    .select("id, patient_id, case_id, kind")
    .eq("id", id)
    .maybeSingle();
  if (!n || n.patient_id !== patientId) return jsonError(404, "not_found");
  const origin = new URL(req.url).origin;

  if (action === "accept") {
    const { data: appt, error } = await db().rpc("accept_slot_offer", {
      p_notification_id: id,
    });
    if (error) {
      const taken =
        error.message.includes("slot_taken") ||
        error.message.includes("not_pending");
      return jsonError(
        409,
        taken ? "slot_taken" : "failed",
        taken ? hr.appointment.taken : hr.appointment.error,
      );
    }
    if (n.case_id)
      await addCaseEvent(
        n.case_id,
        "appointment_moved",
        { notification_id: id },
        "appointment_confirmed",
      );
    if (appt?.id)
      await emailConfirmed(appt.id, origin).catch((e) =>
        console.error("moved email", e),
      );
    return Response.json({ ok: true });
  }

  if (action === "decline") {
    const { data: next, error } = await db().rpc("decline_slot_offer", {
      p_notification_id: id,
    });
    if (error) return jsonError(409, "failed", hr.appointment.error);
    if (next) await deliverNotification(next, origin);
    return Response.json({ ok: true });
  }
  return jsonError(404, "not_found");
}
