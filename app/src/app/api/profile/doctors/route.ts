import { z } from "zod";
import { db } from "@/lib/db/server";
import { ROLES } from "@/lib/agent/routing";
import { jsonError, requirePatient } from "@/lib/patientAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Set the current patient's chosen doctor for one role. */
export async function POST(req: Request) {
  const patientId = await requirePatient();
  if (!patientId) return jsonError(401, "no_patient");
  const body = z
    .object({ role: z.enum(ROLES), practitionerId: z.string().min(3).max(60) })
    .safeParse(await req.json().catch(() => null));
  if (!body.success) return jsonError(400, "bad_request");
  const { data: pr } = await db()
    .from("practitioners")
    .select("id, role")
    .eq("id", body.data.practitionerId)
    .maybeSingle();
  if (!pr || pr.role !== body.data.role) return jsonError(400, "wrong_role");
  const { error } = await db().from("patient_practitioners").upsert({
    patient_id: patientId,
    role: body.data.role,
    practitioner_id: pr.id,
  });
  if (error) return jsonError(500, "failed");
  return Response.json({ ok: true });
}
