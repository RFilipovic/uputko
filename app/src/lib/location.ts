import { z } from "zod";
import { db } from "@/lib/db/server";

export type ResolvedLocation = {
  lat: number;
  lng: number;
  city: string | null;
  source: "gps" | "city" | "chat" | "home";
};

const CityPoint = z.object({ city: z.string(), lat: z.number(), lng: z.number(), n: z.number() });

/** Centre of a town from our open data ("Varazdin" → Varaždin). */
export async function cityPoint(name: string): Promise<z.infer<typeof CityPoint> | null> {
  const clean = name.replace(/^(u|na|kod)\s+/i, "").trim();
  if (clean.length < 2) return null;
  const { data } = await db().rpc("city_point", { p_city: clean });
  const row = Array.isArray(data) ? data[0] : null;
  const parsed = CityPoint.safeParse(row);
  return parsed.success ? parsed.data : null;
}

/** Store where the patient is now on the case (plain lat/lng + PostGIS point). */
export async function saveCaseLocation(caseId: string, loc: ResolvedLocation) {
  await db()
    .from("cases")
    .update({
      patient_lat: loc.lat,
      patient_lng: loc.lng,
      patient_city: loc.city,
      location_source: loc.source,
      patient_location: `SRID=4326;POINT(${loc.lng} ${loc.lat})`,
    })
    .eq("id", caseId);
}
