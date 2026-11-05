import { db } from "@/lib/db/server";
import { jsonError, requirePatient } from "@/lib/patientAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The uploaded uputnica, for its patient only. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const patientId = await requirePatient();
  if (!patientId) return jsonError(401, "no_patient");
  const { id } = await ctx.params;
  const { data } = await db()
    .from("referrals")
    .select("document, document_mime, document_name, cases(patient_id)")
    .eq("id", id)
    .maybeSingle();
  const owner = (data?.cases as unknown as { patient_id: string } | null)
    ?.patient_id;
  if (!data?.document || owner !== patientId)
    return jsonError(404, "not_found");
  const hex = String(data.document).replace(/^\\x/, "");
  return new Response(Buffer.from(hex, "hex"), {
    headers: {
      "Content-Type": data.document_mime ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${(data.document_name ?? "uputnica").replace(/[^\w.-]/g, "_")}"`,
    },
  });
}
