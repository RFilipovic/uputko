import { db } from "@/lib/db/server";
import { isDemo } from "@/lib/demo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "Počni ispočetka" (demo mode only): clear the personas' cases, free their slots. */
export async function POST() {
  if (!(await isDemo()))
    return Response.json({ error: "not_demo" }, { status: 403 });
  const { data, error } = await db().rpc("demo_reset");
  if (error) {
    console.error("demo_reset failed:", error.message);
    return Response.json({ error: "failed" }, { status: 500 });
  }
  return Response.json({ ok: true, ...(data as Record<string, unknown>) });
}
