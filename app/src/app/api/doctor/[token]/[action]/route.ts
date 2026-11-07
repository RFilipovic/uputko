import { z } from "zod";
import {
  ACCEPTED_TYPES,
  extractReferral,
  type AcceptedType,
} from "@/lib/agent/extractReferral";
import { addCaseEvent } from "@/lib/cases";
import { db } from "@/lib/db/server";
import { BOOKABLE_SPECIALTIES, DECIDED, doctorCase } from "@/lib/doctorCase";
import { PatientEmail } from "@/lib/email/PatientEmail";
import { sendDemoEmail } from "@/lib/email/send";
import { formatWhen } from "@/lib/format";
import { nearestPlaces } from "@/lib/geo/places";
import { jsonError } from "@/lib/patientAuth";
import { allow, clientKey, LIMITS } from "@/lib/rateLimit";
import { broadcast, patientTopic } from "@/lib/realtime/broadcast";
import { bestMatch } from "@/lib/similarity";
import { hr } from "@/i18n/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024;
type Ctx = { params: Promise<{ token: string; action: string }> };

async function readFile(form: FormData) {
  const file = form.get("file");
  if (!(file instanceof File))
    return { error: jsonError(400, "no_file", hr.doctor.upload.badType) };
  if (file.size > MAX_BYTES)
    return { error: jsonError(413, "too_big", hr.doctor.upload.tooBig) };
  if (!ACCEPTED_TYPES.includes(file.type as AcceptedType)) {
    return { error: jsonError(415, "bad_type", hr.doctor.upload.badType) };
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  return { file, bytes, mime: file.type as AcceptedType };
}

async function specialtyOptions() {
  const { data } = await db()
    .from("specialties")
    .select("code, name")
    .in("code", [...BOOKABLE_SPECIALTIES]);
  return (data ?? []).sort((a, b) => a.name.localeCompare(b.name, "hr"));
}

async function institutionOptions(
  specialty: string,
  lat: number | null,
  lng: number | null,
) {
  if (lat == null || lng == null) return [];
  return (await nearestPlaces({ specialty, lat, lng, limit: 8 })).map((p) => ({
    id: p.id,
    name: p.name,
    city: p.city,
    distance_km: p.distance_km,
  }));
}

/** GET /api/doctor/:token/institutions?specialty=code */
export async function GET(req: Request, ctx: Ctx) {
  const { token, action } = await ctx.params;
  if (action !== "institutions") return jsonError(404, "not_found");
  const dc = await doctorCase(token);
  if (!dc.ok) return jsonError(403, dc.reason);
  const specialty = z
    .enum(BOOKABLE_SPECIALTIES)
    .safeParse(new URL(req.url).searchParams.get("specialty"));
  if (!specialty.success) return jsonError(400, "bad_specialty");
  return Response.json({
    institutions: await institutionOptions(
      specialty.data,
      dc.case.patient_lat,
      dc.case.patient_lng,
    ),
  });
}

/** POST /api/doctor/:token/(extract|issue|invite) */
export async function POST(req: Request, ctx: Ctx) {
  const { token, action } = await ctx.params;
  const dc = await doctorCase(token);
  if (!dc.ok)
    return jsonError(
      403,
      dc.reason,
      dc.reason === "expired" ? hr.doctor.expired : hr.doctor.invalid,
    );
  const c = dc.case;
  const origin = new URL(req.url).origin;

  if (action === "extract") {
    const ip = clientKey(req);
    if (
      !(await allow(`extract:ip:${ip}`, 3600, LIMITS.extractPerIpPerHour)) ||
      !(await allow("extract:global", 86400, LIMITS.extractGlobalPerDay))
    ) {
      return jsonError(429, "rate_limited", hr.doctor.upload.rateLimited);
    }
    const f = await readFile(await req.formData());
    if ("error" in f) return f.error;
    let extracted;
    try {
      extracted = await extractReferral({
        mime: f.mime,
        base64: f.bytes.toString("base64"),
      });
    } catch (e) {
      console.error("extract failed", e instanceof Error ? e.message : e);
      return jsonError(422, "unreadable", hr.doctor.upload.failed);
    }
    if (!extracted.is_referral)
      return jsonError(422, "not_referral", hr.doctor.upload.failed);

    const specialties = await specialtyOptions();
    const spec = extracted.specialty
      ? bestMatch(extracted.specialty, specialties, (s) => s.name)
      : null;
    const institutions = spec
      ? await institutionOptions(spec.code, c.patient_lat, c.patient_lng)
      : [];
    const inst = extracted.institution
      ? bestMatch(extracted.institution, institutions, (i) => i.name, 0.4)
      : null;
    return Response.json({
      extracted,
      specialtyCode: spec?.code ?? null,
      specialties,
      institutionId: inst?.id ?? institutions[0]?.id ?? null,
      institutionMatched: Boolean(inst),
      institutions,
    });
  }

  if (DECIDED.has(c.status))
    return jsonError(409, "already_decided", hr.doctor.alreadyDone);

  if (action === "issue") {
    const form = await req.formData();
    const f = await readFile(form);
    if ("error" in f) return f.error;
    const fields = z
      .object({
        type: z.string().regex(/^[A-D][0-9]$/),
        specialty: z.enum(BOOKABLE_SPECIALTIES),
        priority: z.enum(["redovna", "prioritetna", "hitna"]),
        institution: z.string().min(3).max(40),
        note: z.string().max(500).optional(),
      })
      .safeParse(
        Object.fromEntries(
          [...form.entries()].filter(([, v]) => typeof v === "string"),
        ),
      );
    if (!fields.success)
      return jsonError(400, "bad_fields", hr.doctor.upload.failed);

    const { data: ref, error } = await db()
      .from("referrals")
      .insert({
        case_id: c.id,
        type: fields.data.type,
        specialty_code: fields.data.specialty,
        priority: fields.data.priority,
        institution_id: fields.data.institution,
        practitioner_id: dc.practitionerId,
        note: fields.data.note || null,
        document: `\\x${f.bytes.toString("hex")}`,
        document_mime: f.mime,
        document_name: f.file.name.slice(0, 120),
      })
      .select("id")
      .single();
    if (error || !ref) return jsonError(500, "failed", hr.doctor.upload.failed);
    await addCaseEvent(
      c.id,
      "referral_issued",
      { referral_id: ref.id },
      "referral_issued",
    );

    // Book the earliest free slot and hold it for 15 minutes.
    const { data: appt, error: proposeError } = await db().rpc(
      "propose_appointment",
      { p_referral_id: ref.id },
    );
    // No free slot is a normal outcome; a database error is not — log it.
    if (proposeError)
      console.error("propose_appointment failed:", proposeError.message);
    let when: string | null = null;
    if (appt?.id) {
      const { data: slot } = await db()
        .from("slots")
        .select("starts_at")
        .eq("id", appt.slot_id)
        .single();
      when = slot ? formatWhen(slot.starts_at) : null;
      await db()
        .from("notifications")
        .insert({
          patient_id: c.patient_id,
          case_id: c.id,
          kind: "appointment_proposed",
          payload: {
            appointment_id: appt.id,
            starts_at: slot?.starts_at ?? null,
          },
        });
      await addCaseEvent(
        c.id,
        "appointment_proposed",
        { appointment_id: appt.id, starts_at: slot?.starts_at ?? null },
        "appointment_proposed",
      );
    } else {
      await addCaseEvent(c.id, "no_slot", {});
    }
    await broadcast(patientTopic(c.patient_id), "notification", {
      kind: "referral_issued",
    });

    const caseUrl = `${origin}/slucaj/${c.id}`;
    await sendDemoEmail({
      subject: when
        ? `Vaša uputnica je izdana — termin ${when}`
        : "Vaša uputnica je izdana",
      react: PatientEmail({
        preview: hr.referral.title,
        title: "Vaša uputnica je izdana",
        lines: [
          when
            ? `Predložen termin: ${when}. Potvrdite ga u Uputku.`
            : hr.appointment.noSlot,
        ],
        buttonLabel: hr.case.title,
        buttonUrl: caseUrl,
      }),
    });
    return Response.json({ ok: true, when });
  }

  if (action === "invite") {
    await addCaseEvent(c.id, "invited_to_exam", {}, "closed");
    await broadcast(patientTopic(c.patient_id), "notification", {
      kind: "invited_to_exam",
    });
    await sendDemoEmail({
      subject: hr.case.invitedTitle,
      react: PatientEmail({
        preview: hr.case.invitedTitle,
        title: hr.case.invitedTitle,
        lines: [hr.case.invitedBody],
        buttonLabel: hr.case.title,
        buttonUrl: `${origin}/slucaj/${c.id}`,
      }),
    });
    return Response.json({ ok: true });
  }
  return jsonError(404, "not_found");
}
