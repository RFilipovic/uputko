import { z } from "zod";
import {
  appointmentIcs,
  appointmentView,
  deliverNotification,
  emailConfirmed,
} from "@/lib/appointments";
import { addCaseEvent } from "@/lib/cases";
import { db } from "@/lib/db/server";
import type { Json } from "@/lib/db/types";
import { jsonError, ownsAppointment, requirePatient } from "@/lib/patientAuth";
import { hr } from "@/i18n/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Availability = z.object({
  days: z
    .array(
      z.object({
        date: z.iso.date(),
        parts: z.array(z.enum(["morning", "afternoon"])).min(1),
      }),
    )
    .min(1)
    .max(14),
});

const dbError = (message: string) =>
  jsonError(
    409,
    message.includes("slot_taken") ? "slot_taken" : "failed",
    message.includes("slot_taken")
      ? hr.appointment.taken
      : hr.appointment.error,
  );

type Ctx = { params: Promise<{ id: string; action: string }> };

/** Calendar file: GET /api/appointments/:id/ics */
export async function GET(_req: Request, ctx: Ctx) {
  const { id, action } = await ctx.params;
  if (action !== "ics") return jsonError(404, "not_found");
  const patientId = await requirePatient();
  if (!patientId || !(await ownsAppointment(patientId, id)))
    return jsonError(404, "not_found");
  const ics = appointmentIcs(await appointmentView(id));
  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="uputko-termin.ics"',
    },
  });
}

/** POST /api/appointments/:id/(confirm|cancel|reschedule) */
export async function POST(req: Request, ctx: Ctx) {
  const { id, action } = await ctx.params;
  const patientId = await requirePatient();
  if (!patientId) return jsonError(401, "no_patient");
  const own = await ownsAppointment(patientId, id);
  if (!own?.caseId) return jsonError(404, "not_found");
  const origin = new URL(req.url).origin;

  if (action === "confirm") {
    const { error } = await db().rpc("confirm_appointment", {
      p_appointment_id: id,
    });
    if (error) return dbError(error.message);
    await addCaseEvent(
      own.caseId,
      "appointment_confirmed",
      { appointment_id: id },
      "appointment_confirmed",
    );
    await emailConfirmed(id, origin).catch((e) =>
      console.error("confirm email", e),
    );
    return Response.json({ ok: true });
  }

  if (action === "cancel") {
    const { data: offered, error } = await db().rpc("cancel_appointment", {
      p_appointment_id: id,
    });
    if (error) return dbError(error.message);
    await addCaseEvent(
      own.caseId,
      "appointment_cancelled",
      { appointment_id: id },
      "closed",
    );
    // The freed slot may now be offered to another patient.
    if (offered) await deliverNotification(offered, origin);
    return Response.json({ ok: true });
  }

  if (action === "reschedule") {
    const body = Availability.safeParse(await req.json().catch(() => null));
    if (!body.success)
      return jsonError(400, "bad_request", hr.appointment.availability.needOne);
    const { error } = await db().rpc("request_reschedule", {
      p_appointment_id: id,
      p_availability: body.data as unknown as Json,
    });
    if (error) return dbError(error.message);
    await addCaseEvent(
      own.caseId,
      "reschedule_requested",
      body.data,
      "reschedule_requested",
    );
    return Response.json({ ok: true });
  }
  return jsonError(404, "not_found");
}
