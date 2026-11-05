import { loadCaseView } from "@/lib/caseData";
import { jsonError, requirePatient } from "@/lib/patientAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Fresh case data — the case page refetches this whenever a live update arrives. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const patientId = await requirePatient();
  if (!patientId) return jsonError(401, "no_patient");
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return jsonError(404, "not_found");
  const view = await loadCaseView(id, patientId);
  return view ? Response.json(view) : jsonError(404, "not_found");
}
