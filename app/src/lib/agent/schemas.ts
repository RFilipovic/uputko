import { z } from "zod";
import { CATEGORIES } from "./routing";

/**
 * Doctor-ready case summary (CLAUDE.md §2.5). Never a diagnosis: the suggested
 * specialty is shown as "prijedlog, ne dijagnoza".
 */
export const CaseSummary = z.object({
  chief_complaint: z.string().min(2).max(300),
  category: z.enum(CATEGORIES),
  for_child: z.boolean(),
  child_age: z.string().nullable(),
  onset: z.string().max(200),
  duration: z.string().max(200),
  fever: z.enum(["da", "ne", "nepoznato"]),
  fever_celsius: z.number().min(34).max(43).nullable(),
  severity: z.number().int().min(1).max(10).nullable(),
  body_location: z.string().max(200),
  associated_symptoms: z.array(z.string().max(120)).max(12),
  relevant_history: z.string().max(400),
  current_location: z.string().max(120),
  suggested_specialty: z.string().max(120),
  urgency: z.enum(["hitno", "uskoro", "rutinski"]),
});
export type CaseSummary = z.infer<typeof CaseSummary>;

/** Same shape as JSON Schema for the tool (strict: every field required, no extras). */
export const CASE_SUMMARY_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "chief_complaint",
    "category",
    "for_child",
    "child_age",
    "onset",
    "duration",
    "fever",
    "fever_celsius",
    "severity",
    "body_location",
    "associated_symptoms",
    "relevant_history",
    "current_location",
    "suggested_specialty",
    "urgency",
  ],
  properties: {
    chief_complaint: {
      type: "string",
      description: "Glavna tegoba svojim riječima pacijenta, kratko.",
    },
    category: {
      type: "string",
      enum: [...CATEGORIES],
      description:
        "zub = zubi/desni; ginekolosko = ginekološke tegobe ili trudnoća; dijete = bolest djeteta (do 18 g.); ostalo = sve ostalo.",
    },
    for_child: { type: "boolean" },
    child_age: {
      type: ["string", "null"],
      description: "Dob djeteta ako se radi o djetetu, inače null.",
    },
    onset: {
      type: "string",
      description: "Kada je počelo, npr. 'prije 2 dana'.",
    },
    duration: {
      type: "string",
      description: "Koliko traje / je li stalno ili povremeno.",
    },
    fever: { type: "string", enum: ["da", "ne", "nepoznato"] },
    fever_celsius: {
      type: ["number", "null"],
      description: "Izmjerena temperatura u °C ili null.",
    },
    severity: {
      type: ["integer", "null"],
      description: "Jačina 1–10 prema pacijentu ili null.",
    },
    body_location: { type: "string" },
    associated_symptoms: { type: "array", items: { type: "string" } },
    relevant_history: {
      type: "string",
      description:
        "Važne bolesti, lijekovi, alergije koje je pacijent naveo; prazno ako ništa.",
    },
    current_location: {
      type: "string",
      description: "Grad u kojem je pacijent sada.",
    },
    suggested_specialty: {
      type: "string",
      description:
        "Prijedlog specijalnosti za liječnika (npr. 'otorinolaringologija'). Prijedlog, NE dijagnoza.",
    },
    urgency: {
      type: "string",
      enum: ["hitno", "uskoro", "rutinski"],
      description:
        "hitno = treba hitna pomoć odmah; uskoro = liječnik u 1–2 dana; rutinski = može pričekati.",
    },
  },
} as const;
