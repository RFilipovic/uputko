import { cookies } from "next/headers";

/** Demo identity: which synthetic persona is using the app (no real login). */
export const PATIENT_COOKIE = "uputko_patient";

export async function currentPatientId(): Promise<string | null> {
  const value = (await cookies()).get(PATIENT_COOKIE)?.value ?? null;
  return value && /^[0-9a-f-]{36}$/i.test(value) ? value : null;
}
