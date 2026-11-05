import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { formatKm } from "@/lib/geo/distance";
import { nearestPreferOpen } from "@/lib/geo/places";
import type { PatientProfile } from "@/lib/patients";
import { ROLE_LABEL } from "@/lib/patients";
import { outcomeForModel, resolveLocation, submitCase, type Outcome } from "./outcome";
import { patientContext, SYSTEM_PROMPT } from "./prompt";
import { ROLES, SPECIALTY_BY_ROLE } from "./routing";
import { CASE_SUMMARY_JSON_SCHEMA, CaseSummary } from "./schemas";

/** Hard ceilings so one message can never trigger an unbounded number of calls. */
const MAX_MODEL_CALLS = 4;
const MAX_TOKENS = 1500;

const FindPlacesInput = z.object({
  kind: z.enum([...ROLES, "hitna"]),
  open_now: z.boolean(),
});

const TOOLS: Anthropic.Tool[] = [
  {
    name: "get_my_doctors",
    description: "Vraća pacijentove izabrane liječnike (uloga, ime, adresa ordinacije).",
    strict: true,
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    name: "find_places",
    description:
      "Najbliže ordinacije ili hitne službe od mjesta gdje je pacijent sada (iz javnih podataka). Koristi samo ako pacijent izričito pita gdje može otići.",
    strict: true,
    input_schema: {
      type: "object",
      additionalProperties: false,
      required: ["kind", "open_now"],
      properties: {
        kind: { type: "string", enum: [...ROLES, "hitna"] },
        open_now: { type: "boolean", description: "Samo one koje su sada otvorene." },
      },
    },
  },
  {
    name: "submit_case_summary",
    description:
      "Završava razgovor: šalje strukturirani sažetak. Sustav sam odlučuje kome ide (izabrani liječnik ili najbliža otvorena ordinacija) i vraća ishod.",
    strict: true,
    input_schema: CASE_SUMMARY_JSON_SCHEMA as unknown as Anthropic.Tool.InputSchema,
  },
];

export type Emit = (event: string, data: Record<string, unknown>) => void;

export type TurnResult = { text: string; outcome: Outcome | null; refused: boolean };

export async function runAgentTurn(opts: {
  caseId: string;
  patient: PatientProfile;
  history: Anthropic.MessageParam[];
  location: { city: string | null; source: string | null };
  origin: string;
  emit: Emit;
}): Promise<TurnResult> {
  const env = serverEnv();
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, timeout: 45_000, maxRetries: 2 });

  const messages: Anthropic.MessageParam[] = [...opts.history];
  let text = "";
  let outcome: Outcome | null = null;

  for (let call = 0; call < MAX_MODEL_CALLS; call++) {
    const stream = client.messages.stream({
      model: env.ANTHROPIC_MODEL,
      max_tokens: MAX_TOKENS,
      // Stable instructions first (cached), then this patient's context.
      system: [
        { type: "text", text: SYSTEM_PROMPT },
        { type: "text", text: patientContext(opts.patient, opts.location) },
      ],
      cache_control: { type: "ephemeral" },
      // Short chat turns: low effort keeps replies fast and cheap.
      output_config: { effort: "low" },
      tools: TOOLS,
      messages,
    });
    stream.on("text", (delta) => {
      text += delta;
      opts.emit("delta", { text: delta });
    });
    const message = await stream.finalMessage();

    if (message.stop_reason === "refusal") {
      return { text, outcome, refused: true };
    }
    const toolUses = message.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    if (toolUses.length === 0) break;
    if (message.stop_reason === "max_tokens") throw new Error("tool input truncated (max_tokens)");

    // Append-only: the assistant turn goes back unchanged (thinking blocks included).
    messages.push({ role: "assistant", content: message.content });
    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const use of toolUses) {
      results.push(await runTool(use, opts, outcome, (o) => (outcome = o)));
    }
    messages.push({ role: "user", content: results });
    if (text && !text.endsWith("\n")) {
      text += "\n\n";
      opts.emit("delta", { text: "\n\n" });
    }
  }
  return { text, outcome, refused: false };
}

async function runTool(
  use: Anthropic.ToolUseBlock,
  opts: Parameters<typeof runAgentTurn>[0],
  current: Outcome | null,
  setOutcome: (o: Outcome) => void,
): Promise<Anthropic.ToolResultBlockParam> {
  const err = (content: string): Anthropic.ToolResultBlockParam => ({
    type: "tool_result",
    tool_use_id: use.id,
    is_error: true,
    content,
  });
  const ok = (content: string): Anthropic.ToolResultBlockParam => ({
    type: "tool_result",
    tool_use_id: use.id,
    content,
  });

  try {
    if (use.name === "get_my_doctors") {
      return ok(
        JSON.stringify(
          opts.patient.doctors.map((d) => ({
            uloga: ROLE_LABEL[d.role],
            ime: `dr. ${d.full_name}`,
            adresa: `${d.address ?? ""}, ${d.city ?? ""}`,
          })),
        ),
      );
    }

    if (use.name === "find_places") {
      const input = FindPlacesInput.safeParse(use.input);
      if (!input.success) return err("Neispravni parametri.");
      const loc = await resolveLocation(opts.caseId, opts.patient, null);
      if (!loc) return err("Lokacija pacijenta nije poznata. Pitaj u kojem je gradu.");
      const specialty = input.data.kind === "hitna" ? "hitna-medicina-ohbp" : SPECIALTY_BY_ROLE[input.data.kind];
      const { places, anyOpen } = await nearestPreferOpen({ specialty, lat: loc.lat, lng: loc.lng, limit: 3 });
      return ok(
        JSON.stringify({
          od: loc.city,
          ima_otvorenih: anyOpen,
          mjesta: places.map((p) => ({
            naziv: p.name,
            adresa: `${p.address ?? ""}, ${p.city ?? ""}`,
            udaljenost: formatKm(p.distance_km),
            otvoreno_sada: p.open_now,
            otvoreno_do: p.closes_at?.slice(0, 5) ?? null,
          })),
        }),
      );
    }

    if (use.name === "submit_case_summary") {
      if (current) return err("Sažetak je već poslan.");
      const parsed = CaseSummary.safeParse(use.input);
      if (!parsed.success) {
        return err(`Sažetak nije ispravan: ${parsed.error.issues.map((i) => i.path.join(".")).join(", ")}`);
      }
      const outcome = await submitCase({
        caseId: opts.caseId,
        patient: opts.patient,
        summary: parsed.data,
        origin: opts.origin,
      });
      setOutcome(outcome);
      opts.emit("outcome", { outcome });
      return ok(outcomeForModel(outcome));
    }
    return err(`Nepoznat alat: ${use.name}`);
  } catch (e) {
    console.error("tool failed", use.name, e instanceof Error ? e.message : e);
    return err("Došlo je do greške u sustavu. Reci pacijentu da pokuša ponovno.");
  }
}
