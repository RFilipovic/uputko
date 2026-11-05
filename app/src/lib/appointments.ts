import { addCaseEvent } from "@/lib/cases";
import { db, must } from "@/lib/db/server";
import { PatientEmail } from "@/lib/email/PatientEmail";
import { sendDemoEmail } from "@/lib/email/send";
import { formatWhen } from "@/lib/format";
import { buildIcs } from "@/lib/ics";
import { broadcast, patientTopic } from "@/lib/realtime/broadcast";
import { hr } from "@/i18n/hr";

/** Everything the UI and emails need about one appointment. */
export async function appointmentView(appointmentId: string) {
  const appt = must(
    await db()
      .from("appointments")
      .select(
        "id, status, patient_id, patient_availability_json, referral_id, slot_id",
      )
      .eq("id", appointmentId)
      .single(),
    "appointment",
  );
  const slot = must(
    await db()
      .from("slots")
      .select(
        "id, starts_at, ends_at, institution_id, specialty_code, status, held_until",
      )
      .eq("id", appt.slot_id)
      .single(),
    "slot",
  );
  const referral = must(
    await db()
      .from("referrals")
      .select("id, case_id, type, specialty_code, priority")
      .eq("id", appt.referral_id)
      .single(),
    "referral",
  );
  const { data: inst } = await db().rpc("institution_card", {
    p_institution_id: slot.institution_id,
  });
  const { data: spec } = await db()
    .from("specialties")
    .select("name")
    .eq("code", slot.specialty_code)
    .single();
  const card = (inst ?? {}) as {
    name?: string;
    address?: string;
    city?: string;
  };
  return {
    appt,
    slot,
    referral,
    institution: card,
    specialtyName: spec?.name ?? slot.specialty_code,
  };
}

export function appointmentIcs(v: Awaited<ReturnType<typeof appointmentView>>) {
  return buildIcs({
    uid: v.appt.id,
    start: v.slot.starts_at,
    end: v.slot.ends_at,
    title: `${v.specialtyName} — ${v.institution.name ?? ""}`,
    location: `${v.institution.name ?? ""}, ${v.institution.address ?? ""}, ${v.institution.city ?? ""}`,
    description: `Ponesite: ${hr.appointment.bring.join("; ")}. Demo termin (Uputko).`,
  });
}

/** Email + live push for a patient notification row. */
export async function deliverNotification(
  notificationId: string,
  origin: string,
) {
  const n = must(
    await db()
      .from("notifications")
      .select("id, patient_id, case_id, kind, payload")
      .eq("id", notificationId)
      .single(),
    "notification",
  );
  await broadcast(patientTopic(n.patient_id), "notification", {
    id: n.id,
    kind: n.kind,
  });
  const p = n.payload as { starts_at?: string; institution_name?: string };
  const when = p.starts_at ? formatWhen(p.starts_at) : "";
  const place = p.institution_name ?? "";
  const caseUrl = `${origin}/slucaj/${n.case_id}`;
  if (n.kind === "earlier_slot_offer" || n.kind === "reschedule_offer") {
    const title =
      n.kind === "earlier_slot_offer"
        ? hr.notifications.earlierTitle
        : hr.notifications.rescheduleTitle;
    const body =
      n.kind === "earlier_slot_offer"
        ? hr.notifications.earlierBody(when, place)
        : hr.notifications.rescheduleBody(when, place);
    await sendDemoEmail({
      subject: `${title}: ${when}`,
      react: PatientEmail({
        preview: body,
        title,
        lines: [body],
        buttonLabel: hr.notifications.open,
        buttonUrl: caseUrl,
      }),
    });
  }
  if (n.case_id) {
    const kind =
      n.kind === "earlier_slot_offer"
        ? "earlier_slot_offered"
        : n.kind === "reschedule_offer"
          ? "reschedule_offered"
          : n.kind;
    await addCaseEvent(n.case_id, kind, {
      notification_id: n.id,
      starts_at: p.starts_at ?? null,
      institution: place,
    });
  }
}

/** Email the patient their confirmed appointment with the calendar file attached. */
export async function emailConfirmed(appointmentId: string, origin: string) {
  const v = await appointmentView(appointmentId);
  const when = formatWhen(v.slot.starts_at);
  await sendDemoEmail({
    subject: `Termin potvrđen: ${when}`,
    react: PatientEmail({
      preview: `${when}, ${v.institution.name ?? ""}`,
      title: hr.appointment.confirmedTitle,
      lines: [
        `${when}`,
        `${v.institution.name ?? ""}, ${v.institution.address ?? ""}, ${v.institution.city ?? ""}`,
      ],
      details: [
        [hr.referral.specialty, v.specialtyName],
        [hr.appointment.whatToBring, hr.appointment.bring.join(", ")],
      ],
      buttonLabel: hr.case.title,
      buttonUrl: `${origin}/slucaj/${v.referral.case_id}`,
    }),
    attachments: [
      {
        filename: "termin.ics",
        content: Buffer.from(appointmentIcs(v)).toString("base64"),
        contentType: "text/calendar",
      },
    ],
  });
}
