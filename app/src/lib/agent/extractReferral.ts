import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { serverEnv } from "@/lib/env";

/** What we need from an uploaded uputnica to book an appointment. */
export const ExtractedReferral = z.object({
  is_referral: z.boolean(),
  referral_type: z.string().nullable(),
  specialty: z.string().nullable(),
  institution: z.string().nullable(),
  priority: z.enum(["redovna", "prioritetna", "hitna"]).nullable(),
  note: z.string().nullable(),
});
export type ExtractedReferral = z.infer<typeof ExtractedReferral>;

export const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;
export type AcceptedType = (typeof ACCEPTED_TYPES)[number];

const INSTRUCTIONS = `Ovo je hrvatska uputnica (dokument liječnika). Pročitaj iz nje samo:
- referral_type: oznaka vrste uputnice ako piše (npr. "A1", "A2", "A3", "C1"), inače null
- specialty: specijalnost ili djelatnost na koju se upućuje (npr. "otorinolaringologija", "kardiologija")
- institution: zdravstvena ustanova na koju se upućuje (naziv)
- priority: "redovna", "prioritetna" ili "hitna" prema dokumentu; ako ništa ne piše, "redovna"
- note: kratka napomena liječnika ako postoji, inače null
Ako dokument nije uputnica, postavi is_referral na false i ostalo na null. Ne izmišljaj podatke koji ne pišu.`;

/** Read the uputnica with Claude (PDF or image). Synthetic demo documents only. */
export async function extractReferral(file: {
  mime: AcceptedType;
  base64: string;
}): Promise<ExtractedReferral> {
  const env = serverEnv();
  if (!env.ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not set");
  const client = new Anthropic({
    apiKey: env.ANTHROPIC_API_KEY,
    timeout: 60_000,
    maxRetries: 2,
  });

  const source: Anthropic.ContentBlockParam =
    file.mime === "application/pdf"
      ? {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: file.base64,
          },
        }
      : {
          type: "image",
          source: { type: "base64", media_type: file.mime, data: file.base64 },
        };

  const response = await client.messages.parse({
    model: env.ANTHROPIC_MODEL,
    max_tokens: 2000,
    output_config: {
      effort: "low",
      format: zodOutputFormat(ExtractedReferral),
    },
    messages: [
      { role: "user", content: [source, { type: "text", text: INSTRUCTIONS }] },
    ],
  });
  if (response.stop_reason === "refusal" || !response.parsed_output) {
    throw new Error("referral could not be read");
  }
  return response.parsed_output;
}
