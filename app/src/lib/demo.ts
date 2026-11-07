import { cookies } from "next/headers";
import { submitCase, type Outcome } from "@/lib/agent/outcome";
import type { ExtractedReferral } from "@/lib/agent/extractReferral";
import type { Emit } from "@/lib/agent/run";
import type { CaseSummary } from "@/lib/agent/schemas";
import type { PatientProfile } from "@/lib/patients";

/**
 * Demo-safe mode (?demo=1). For recording the video: if the model is slow or
 * fails, the chat continues with a prepared conversation for the persona, so a
 * take never depends on the API. Off by default; real visitors never see it.
 */
export const DEMO_COOKIE = "uputko_demo";

/** If no text has streamed by then, the prepared reply takes over. */
export const DEMO_FIRST_TOKEN_MS = 8_000;

export async function isDemo(): Promise<boolean> {
  return (await cookies()).get(DEMO_COOKIE)?.value === "1";
}

type Script = {
  /** One short question per turn, in the agent's style (OPCIJE = quick replies). */
  questions: string[];
  summary: (city: string) => CaseSummary;
};

const base = {
  for_child: false,
  child_age: null,
  fever_celsius: null,
  associated_symptoms: [] as string[],
  relevant_history: "nije navedeno",
} as const;

/** Keyed by persona name (synthetic personas from the seed). */
const SCRIPTS: Record<string, Script> = {
  "Ana Horvat": {
    questions: [
      "Koliko jako boli, od 1 do 10?\nOPCIJE: 1–3 (blago) | 4–6 (srednje) | 7–10 (jako)",
      "Imate li temperaturu?\nOPCIJE: Da | Ne | Ne znam",
      "Curi li nešto iz uha ili slabije čujete?\nOPCIJE: Curi | Slabije čujem | Ništa od toga",
    ],
    summary: (city) => ({
      ...base,
      chief_complaint: "Bol u uhu, probadajuća",
      category: "ostalo",
      onset: "prije 2 dana",
      duration: "stalno",
      fever: "ne",
      severity: 5,
      body_location: "uho",
      associated_symptoms: ["slabije čuje"],
      current_location: city,
      suggested_specialty: "otorinolaringologija",
      urgency: "uskoro",
    }),
  },
  "Luka Kovačević": {
    questions: [
      "Koji zub boli — gore ili dolje, lijevo ili desno?\nOPCIJE: Gore lijevo | Gore desno | Dolje lijevo | Dolje desno",
      "Je li desni otečena ili imate temperaturu?\nOPCIJE: Otečena desni | Temperatura | Ništa od toga",
      "Je li bol stalna ili dolazi i prolazi?\nOPCIJE: Stalna | Dolazi i prolazi",
    ],
    summary: (city) => ({
      ...base,
      chief_complaint: "Zubobolja",
      category: "zub",
      onset: "od jučer",
      duration: "stalno",
      fever: "ne",
      severity: 7,
      body_location: "zub",
      associated_symptoms: ["otečena desni"],
      current_location: city,
      suggested_specialty: "dentalna medicina",
      urgency: "uskoro",
    }),
  },
  "Maja Babić": {
    questions: [
      "Koliko je dijete staro i koliko mu je temperatura?",
      "Pije li dijete dovoljno tekućine?\nOPCIJE: Da | Slabije | Ne",
      "Ima li dijete osip, kašalj ili povraća?\nOPCIJE: Osip | Kašalj | Povraća | Ništa od toga",
    ],
    summary: (city) => ({
      ...base,
      chief_complaint: "Dijete ima temperaturu",
      category: "dijete",
      for_child: true,
      child_age: "4 godine",
      onset: "od jučer",
      duration: "stalno",
      fever: "da",
      fever_celsius: 38.5,
      severity: null,
      body_location: "cijelo tijelo",
      current_location: city,
      suggested_specialty: "pedijatrija",
      urgency: "uskoro",
    }),
  },
};

const GENERIC: Script = {
  questions: [
    "Od kada traje?\nOPCIJE: Danas | 1–2 dana | Više dana",
    "Koliko jako, od 1 do 10?\nOPCIJE: 1–3 (blago) | 4–6 (srednje) | 7–10 (jako)",
    "Imate li temperaturu?\nOPCIJE: Da | Ne | Ne znam",
  ],
  summary: (city) => ({
    ...base,
    chief_complaint: "Tegoba prema opisu pacijenta",
    category: "ostalo",
    onset: "nije navedeno",
    duration: "nije navedeno",
    fever: "nepoznato",
    severity: null,
    body_location: "nije navedeno",
    current_location: city,
    suggested_specialty: "obiteljska medicina",
    urgency: "rutinski",
  }),
};

/**
 * What the sample uputnica (public/demo/uputnica-ana-orl.png) says. Used in
 * demo mode when reading the uploaded file is slow or fails.
 */
export const DEMO_REFERRAL: ExtractedReferral = {
  is_referral: true,
  referral_type: "A1",
  specialty: "otorinolaringologija",
  institution: "Klinički bolnički centar Zagreb",
  priority: "redovna",
  note: "Bol u uhu 2 dana, slabiji sluh. Molim pregled.",
};

/** Emit text in small pieces so a prepared reply still streams like a real one. */
async function streamText(text: string, emit: Emit) {
  const parts = text.match(/\S+\s*/g) ?? [text];
  for (const p of parts) {
    emit("delta", { text: p });
    await new Promise((r) => setTimeout(r, 25));
  }
}

/**
 * The prepared turn: ask the persona's next question, or, when the questions
 * are used up (or the patient pressed "Pošalji liječniku"), submit the
 * persona's summary through the normal routing (same code as the agent).
 */
export async function demoTurn(opts: {
  caseId: string;
  patient: PatientProfile;
  assistantTurns: number;
  city: string | null;
  finishNow: boolean;
  origin: string;
  emit: Emit;
}): Promise<{ text: string; outcome: Outcome | null }> {
  const script = SCRIPTS[opts.patient.name] ?? GENERIC;
  const next = script.questions[opts.assistantTurns];
  if (next && !opts.finishNow) {
    await streamText(next, opts.emit);
    return { text: next, outcome: null };
  }
  const summary = script.summary(opts.city ?? opts.patient.home_city);
  const outcome = await submitCase({
    caseId: opts.caseId,
    patient: opts.patient,
    summary,
    origin: opts.origin,
  });
  opts.emit("outcome", { outcome });
  return { text: "", outcome };
}
