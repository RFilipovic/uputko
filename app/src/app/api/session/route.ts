import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db/server";
import { getPatientProfile } from "@/lib/patients";
import { currentPatientId, PATIENT_COOKIE } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Which demo persona am I? */
export async function GET() {
  const id = await currentPatientId();
  const profile = id ? await getPatientProfile(id) : null;
  return Response.json({ patient: profile });
}

/** Pick a demo persona (synthetic patients only; no real login). */
export async function POST(req: Request) {
  const body = z
    .object({ patientId: z.uuid() })
    .safeParse(await req.json().catch(() => null));
  if (!body.success)
    return Response.json({ error: "bad_request" }, { status: 400 });
  const { data } = await db()
    .from("patients")
    .select("id")
    .eq("id", body.data.patientId)
    .maybeSingle();
  if (!data)
    return Response.json({ error: "unknown_patient" }, { status: 404 });
  (await cookies()).set(PATIENT_COOKIE, data.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return Response.json({ ok: true });
}

/** Switch persona: forget the current one. */
export async function DELETE() {
  (await cookies()).delete(PATIENT_COOKIE);
  return Response.json({ ok: true });
}
