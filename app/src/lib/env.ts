import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(10),
  ANTHROPIC_API_KEY: z.string().min(10).optional(),
  ANTHROPIC_MODEL: z.string().default("claude-haiku-5-5"),
  RESEND_API_KEY: z.string().min(5).optional(),
  EMAIL_FROM: z.string().default("Uputko <onboarding@resend.dev>"),
  /** Every demo email goes ONLY here — never to real doctors. */
  DEMO_INBOX: z.email().optional(),
});

export type ServerEnv = z.infer<typeof schema>;
let cached: ServerEnv | null = null;

/** Server-only environment, validated once. Throws with a clear message if misconfigured. */
export function serverEnv(): ServerEnv {
  if (!cached) cached = schema.parse(process.env);
  return cached;
}
