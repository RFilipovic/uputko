import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { splitOptions } from "@/lib/agent/options";
import { readiness } from "@/lib/agent/readiness";
import { escalateEmergency, type Outcome } from "@/lib/agent/outcome";
import { checkRedFlags } from "@/lib/agent/redFlags";
import { runAgentTurn } from "@/lib/agent/run";
import { addCaseEvent } from "@/lib/cases";
import { db, must } from "@/lib/db/server";
import { cityPoint, saveCaseLocation } from "@/lib/location";
import { getPatientProfile } from "@/lib/patients";
import { allow, clientKey, LIMITS } from "@/lib/rateLimit";
import { currentPatientId } from "@/lib/session";
import { hr } from "@/i18n/hr";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const Body = z.object({
  caseId: z.uuid().optional(),
  message: z.string().trim().max(LIMITS.messageMaxChars).default(""),
  /** "Pošalji liječniku" button: submit the case now with what is known. */
  finish: z.boolean().default(false),
  location: z
    .discriminatedUnion("source", [
      z.object({
        source: z.literal("gps"),
        lat: z.number().min(42).max(47),
        lng: z.number().min(13).max(20),
      }),
      z.object({
        source: z.literal("city"),
        city: z.string().trim().min(2).max(60),
      }),
    ])
    .optional(),
});

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status });
}

export async function POST(req: Request) {
  const patientId = await currentPatientId();
  if (!patientId)
    return json(401, {
      error: "no_patient",
      message: hr.chat.errors.noPatient,
    });

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return json(400, { error: "bad_request", message: hr.chat.errors.tooLong });
  const { location, finish } = parsed.data;
  const message = finish ? hr.chat.finishMessage : parsed.data.message;
  if (!message)
    return json(400, { error: "bad_request", message: hr.chat.errors.generic });
  if (finish && !parsed.data.caseId)
    return json(409, { error: "not_ready", message: hr.chat.finish.notReady });

  const ip = clientKey(req);
  if (!(await allow(`chat:ip:${ip}`, 3600, LIMITS.chatPerIpPerHour))) {
    return json(429, {
      error: "rate_limited",
      message: hr.chat.errors.rateLimited,
    });
  }
  if (!(await allow("chat:global", 86400, LIMITS.chatGlobalPerDay))) {
    return json(429, { error: "busy", message: hr.chat.errors.busy });
  }

  const patient = await getPatientProfile(patientId);
  if (!patient)
    return json(401, {
      error: "no_patient",
      message: hr.chat.errors.noPatient,
    });

  // Find or start the case.
  let caseId: string;
  if (parsed.data.caseId) {
    const { data: c } = await db()
      .from("cases")
      .select("id, patient_id, status")
      .eq("id", parsed.data.caseId)
      .maybeSingle();
    if (!c || c.patient_id !== patientId)
      return json(404, { error: "no_case", message: hr.chat.errors.generic });
    if (c.status !== "intake")
      return json(409, {
        error: "case_closed",
        message: hr.chat.errors.caseClosed,
      });
    caseId = c.id;
  } else {
    caseId = must(
      await db()
        .from("cases")
        .insert({ patient_id: patientId, status: "intake" })
        .select("id")
        .single(),
      "new case",
    ).id;
    await addCaseEvent(caseId, "intake_started", {});
  }

  const { data: earlier } = await db()
    .from("messages")
    .select("content")
    .eq("case_id", caseId)
    .eq("role", "user")
    .order("created_at");
  const userTexts = (earlier ?? []).map((m) => m.content);
  if (userTexts.length >= LIMITS.chatPerCase) {
    return json(429, {
      error: "case_limit",
      message: hr.chat.errors.caseLimit,
    });
  }
  // The button is unlocked by what the patient wrote, never by the button press itself.
  if (finish && !readiness(userTexts).ready) {
    return json(409, { error: "not_ready", message: hr.chat.finish.notReady });
  }
  const ready = finish
    ? readiness(userTexts)
    : readiness([...userTexts, message]);

  // Where is the patient right now?
  let locationCity: string | null = null;
  let locationSource: string | null = null;
  if (location?.source === "gps") {
    await saveCaseLocation(caseId, {
      lat: location.lat,
      lng: location.lng,
      city: null,
      source: "gps",
    });
    locationSource = "gps";
  } else if (location?.source === "city") {
    const pt = await cityPoint(location.city);
    if (pt) {
      await saveCaseLocation(caseId, {
        lat: pt.lat,
        lng: pt.lng,
        city: pt.city,
        source: "city",
      });
      locationCity = pt.city;
      locationSource = "city";
    }
  }
  if (!locationSource) {
    const { data: c } = await db()
      .from("cases")
      .select("patient_city, location_source")
      .eq("id", caseId)
      .single();
    locationCity = c?.patient_city ?? null;
    locationSource = c?.location_source ?? null;
  }
  if (locationSource === "gps" && !locationCity)
    locationCity = "poznata lokacija uređaja";

  await db()
    .from("messages")
    .insert({ case_id: caseId, role: "user", content: message });
  const origin = new URL(req.url).origin;
  const id = caseId;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const emit = (event: string, data: Record<string, unknown>) =>
        controller.enqueue(
          enc.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      emit("case", { caseId: id });
      emit("ready", { ready: ready.ready, missing: ready.missing });

      try {
        // Safety gate: deterministic rules run BEFORE the model sees the message.
        const flags = checkRedFlags(message);
        if (flags.triggered) {
          const outcome = await escalateEmergency(id, patient, flags.rules);
          await db().from("messages").insert({
            case_id: id,
            role: "assistant",
            content: hr.emergency.chatText,
          });
          emit("outcome", { outcome });
          emit("done", {});
          controller.close();
          return;
        }

        const { data: rows } = await db()
          .from("messages")
          .select("role, content")
          .eq("case_id", id)
          .in("role", ["user", "assistant"])
          .order("created_at")
          .order("id");
        const history: Anthropic.MessageParam[] = (rows ?? []).map((r) => ({
          role: r.role as "user" | "assistant",
          content: r.content,
        }));

        const result = await runAgentTurn({
          caseId: id,
          patient,
          history,
          location: { city: locationCity, source: locationSource },
          origin,
          emit,
          finishNow: finish,
        });

        let text = result.text;
        if (finish && !result.outcome) {
          emit("error", { message: hr.chat.finish.failed });
        } else if (result.refused || !text.trim()) {
          text = result.outcome ? "" : hr.chat.errors.refused;
          if (text) emit("delta", { text });
        }
        const { text: clean, options } = splitOptions(text);
        if (clean.trim()) {
          await db()
            .from("messages")
            .insert({ case_id: id, role: "assistant", content: text });
        }
        // Emergency from the model's own urgency: the outcome already says so.
        const outcome: Outcome | null = result.outcome;
        if (options.length && !outcome) emit("options", { options });
        emit("done", {});
      } catch (err) {
        console.error("chat failed", err instanceof Error ? err.message : err);
        emit("error", { message: hr.chat.errors.generic });
      } finally {
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
