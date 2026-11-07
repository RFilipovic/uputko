import { z } from "zod";
import { deliverNotification } from "@/lib/appointments";
import { db } from "@/lib/db/server";
import { earlierBookedSlot, listBookings } from "@/lib/institution";
import { jsonError } from "@/lib/patientAuth";
import { hr } from "@/i18n/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Demo-only institution panel actions (synthetic data; no Claude calls).
 * POST /api/institution/free-earlier { appointmentId }
 * POST /api/institution/offer        { appointmentId, slotId }
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ action: string }> },
) {
  const { action } = await ctx.params;
  const origin = new URL(req.url).origin;
  const body = z
    .object({ appointmentId: z.uuid(), slotId: z.uuid().optional() })
    .safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError(400, "bad_request");
  const booking = (await listBookings()).find(
    (b) => b.appointmentId === body.data.appointmentId,
  );
  if (!booking) return jsonError(404, "not_found");

  if (action === "free-earlier") {
    const slot = await earlierBookedSlot(booking);
    if (!slot) return jsonError(409, "no_earlier", hr.institution.noEarlier);
    const { data: offered, error } = await db().rpc("free_slot", {
      p_slot_id: slot.id,
    });
    if (error) return jsonError(500, "failed", hr.institution.error);
    if (offered) await deliverNotification(offered, origin);
    return Response.json({ ok: true, offered: Boolean(offered) });
  }

  if (action === "offer") {
    if (!body.data.slotId) return jsonError(400, "bad_request");
    const { data: offered, error } = await db().rpc("offer_reschedule", {
      p_appointment_id: booking.appointmentId,
      p_slot_id: body.data.slotId,
    });
    if (error || !offered)
      return jsonError(409, "failed", hr.institution.error);
    await deliverNotification(offered, origin);
    return Response.json({ ok: true });
  }
  return jsonError(404, "not_found");
}
