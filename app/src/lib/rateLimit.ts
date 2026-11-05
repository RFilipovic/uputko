import { createHash } from "node:crypto";
import { db } from "@/lib/db/server";

/** Limits for anything that spends Claude credits. Tuned for a demo, not a crowd. */
export const LIMITS = {
  chatPerIpPerHour: 40,
  chatPerCase: 20,
  chatGlobalPerDay: 800,
  extractPerIpPerHour: 10,
  extractGlobalPerDay: 60,
  messageMaxChars: 800,
} as const;

/** One-way hash of the client IP: we count requests without storing addresses. */
export function clientKey(req: Request): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "local";
  return createHash("sha256").update(`uputko:${ip}`).digest("hex").slice(0, 32);
}

/** Counts one hit; true while under the limit. Fails closed if the DB is unreachable. */
export async function allow(key: string, windowSeconds: number, max: number): Promise<boolean> {
  const { data, error } = await db().rpc("hit_rate_limit", {
    p_key: key,
    p_window_seconds: windowSeconds,
    p_max: max,
  });
  if (error) {
    console.error("rate limit check failed", error.message);
    return false;
  }
  return data === true;
}
