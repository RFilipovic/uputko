import { createHash, randomBytes } from "node:crypto";
import { db, must } from "@/lib/db/server";

const TTL_HOURS = 72;
const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/** New link token for a case. Only its hash is stored; the raw token goes in the email. */
export async function createDoctorToken(caseId: string, practitionerId: string | null): Promise<string> {
  const token = randomBytes(24).toString("base64url");
  must(
    await db()
      .from("doctor_tokens")
      .insert({
        token_hash: hash(token),
        case_id: caseId,
        practitioner_id: practitionerId,
        expires_at: new Date(Date.now() + TTL_HOURS * 3600_000).toISOString(),
      })
      .select("token_hash")
      .single(),
    "doctor token",
  );
  return token;
}

export type TokenCheck =
  | { ok: true; caseId: string; practitionerId: string | null; firstUse: boolean }
  | { ok: false; reason: "invalid" | "expired" };

/** Validate a link token. The link stays usable until it expires (doctors reload pages). */
export async function checkDoctorToken(token: string): Promise<TokenCheck> {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return { ok: false, reason: "invalid" };
  const { data } = await db()
    .from("doctor_tokens")
    .select("case_id, practitioner_id, expires_at, first_used_at")
    .eq("token_hash", hash(token))
    .maybeSingle();
  if (!data) return { ok: false, reason: "invalid" };
  if (new Date(data.expires_at) < new Date()) return { ok: false, reason: "expired" };
  const firstUse = !data.first_used_at;
  if (firstUse) {
    await db().from("doctor_tokens").update({ first_used_at: new Date().toISOString() }).eq("token_hash", hash(token));
  }
  return { ok: true, caseId: data.case_id, practitionerId: data.practitioner_id, firstUse };
}
