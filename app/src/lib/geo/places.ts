import { z } from "zod";
import { db } from "@/lib/db/server";

export const Place = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  phone: z.string().nullable(),
  web: z.string().nullable(),
  lat: z.number(),
  lng: z.number(),
  distance_km: z.number(),
  geo_precision: z.string().nullable(),
  source_dataset: z.string(),
  has_hours: z.boolean().nullable(),
  open_now: z.boolean().nullable(),
  closes_at: z.string().nullable(),
  is_on_call: z.boolean().nullable(),
});
export type Place = z.infer<typeof Place>;

/** Nearest places offering a specialty (KNN in PostGIS; approximate coordinates rank last). */
export async function nearestPlaces(opts: {
  specialty: string;
  lat: number;
  lng: number;
  limit?: number;
  openNow?: boolean;
  at?: Date;
}): Promise<Place[]> {
  const { data, error } = await db().rpc("nearest_institutions", {
    p_specialty: opts.specialty,
    p_lat: opts.lat,
    p_lng: opts.lng,
    p_limit: opts.limit ?? 5,
    p_open_now: opts.openNow ?? false,
    p_at: (opts.at ?? new Date()).toISOString(),
  });
  if (error) throw new Error(`nearest places: ${error.message}`);
  return z.array(Place).parse(data ?? []);
}

/** Open places first; if nothing is open, the nearest ones with their hours. */
export async function nearestPreferOpen(opts: {
  specialty: string;
  lat: number;
  lng: number;
  limit?: number;
}) {
  const open = await nearestPlaces({ ...opts, openNow: true });
  if (open.length) return { places: open, anyOpen: true };
  return { places: await nearestPlaces(opts), anyOpen: false };
}
