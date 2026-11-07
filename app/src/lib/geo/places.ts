import { z } from "zod";
import { db } from "@/lib/db/server";
import { nextOpening, zagrebNow } from "@/lib/geo/nextOpening";

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
  /** Closed places: when they open next ("sutra u 7:00"). Added after the query. */
  next_open: z.string().nullable().optional(),
});
export type Place = z.infer<typeof Place>;

const OHBP = "hitna-medicina-ohbp";

/** Add "opens next" to places that are closed now and have known hours. */
async function withNextOpening(places: Place[], at = new Date()) {
  const closed = places.filter((p) => p.has_hours && p.open_now === false);
  if (!closed.length) return places;
  const { data } = await db()
    .from("institution_hours")
    .select("institution_id, weekday, opens, closes")
    .in(
      "institution_id",
      closed.map((p) => p.id),
    );
  const now = zagrebNow(at);
  return places.map((p) => {
    const rows = (data ?? []).filter((h) => h.institution_id === p.id);
    return rows.length ? { ...p, next_open: nextOpening(rows, now) } : p;
  });
}

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

/**
 * Open places first. If nothing is open: the nearest ones with when they open
 * next, plus the nearest emergency department (open 0–24) for "can't wait".
 */
export async function nearestPreferOpen(opts: {
  specialty: string;
  lat: number;
  lng: number;
  limit?: number;
}): Promise<{ places: Place[]; anyOpen: boolean; onCall: Place | null }> {
  const open = await nearestPlaces({ ...opts, openNow: true });
  if (open.length) return { places: open, anyOpen: true, onCall: null };
  const places = await withNextOpening(await nearestPlaces(opts));
  const onCall =
    opts.specialty === OHBP
      ? null
      : ((
          await nearestPlaces({
            specialty: OHBP,
            lat: opts.lat,
            lng: opts.lng,
            limit: 1,
          })
        )[0] ?? null);
  return { places, anyOpen: false, onCall };
}
