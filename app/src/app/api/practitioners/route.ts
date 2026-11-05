import { z } from "zod";
import { db } from "@/lib/db/server";
import { ROLES } from "@/lib/agent/routing";
import { jsonError } from "@/lib/patientAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Onboarding search: GET /api/practitioners?role=stomatolog&q=Split (public open data). */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = z
    .object({ role: z.enum(ROLES), q: z.string().trim().min(2).max(60) })
    .safeParse({ role: url.searchParams.get("role"), q: url.searchParams.get("q") });
  if (!q.success) return jsonError(400, "bad_request");
  const { data, error } = await db().rpc("search_practitioners", { p_role: q.data.role, p_query: q.data.q, p_limit: 20 });
  if (error) return jsonError(500, "failed");
  return Response.json({ results: data ?? [] });
}
