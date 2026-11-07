/** One opening-hours row (weekday: ISO 1 = Monday … 7 = Sunday, Zagreb time). */
export type HoursRow = { weekday: number; opens: string; closes: string };

const DAYS = [
  "",
  "ponedjeljak",
  "utorak",
  "srijeda",
  "četvrtak",
  "petak",
  "subota",
  "nedjelja",
];

/** Weekday (ISO) and "HH:MM" of a moment in Zagreb time. */
export function zagrebNow(at: Date): { weekday: number; time: string } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Zagreb",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday =
    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")) +
    1;
  return { weekday, time: `${get("hour")}:${get("minute")}` };
}

/**
 * When does a closed place open next? "danas u 13:00", "sutra u 7:00",
 * "ponedjeljak u 7:00", or null if it has no hours at all.
 */
export function nextOpening(
  hours: HoursRow[],
  now: { weekday: number; time: string },
): string | null {
  if (!hours.length) return null;
  for (let d = 0; d < 7; d++) {
    const wd = ((now.weekday - 1 + d) % 7) + 1;
    const opens = hours
      .filter((h) => h.weekday === wd)
      .map((h) => h.opens.slice(0, 5))
      .filter((o) => d > 0 || o > now.time)
      .sort();
    if (opens.length) {
      const when = d === 0 ? "danas" : d === 1 ? "sutra" : DAYS[wd];
      return `${when} u ${opens[0].replace(/^0/, "")}`;
    }
  }
  return null;
}
