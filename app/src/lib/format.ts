const TZ = "Europe/Zagreb";

/** Calendar parts of a moment in Zagreb time. */
function zagreb(iso: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    get("weekday"),
  );
  return {
    weekday,
    day: Number(get("day")),
    month: Number(get("month")),
    year: Number(get("year")),
    hour: Number(get("hour")),
    minute: get("minute"),
  };
}

const DAYS = [
  "nedjelja",
  "ponedjeljak",
  "utorak",
  "srijeda",
  "četvrtak",
  "petak",
  "subota",
];

/** "utorak, 10. 11. u 9:30" */
export function formatWhen(iso: string): string {
  const z = zagreb(iso);
  return `${DAYS[z.weekday]}, ${z.day}. ${z.month}. u ${z.hour}:${z.minute}`;
}

/** "10. 11. 2026." */
export function formatDate(iso: string): string {
  const z = zagreb(iso);
  return `${z.day}. ${z.month}. ${z.year}.`;
}

/** "14:30" from "14:30:00" */
export const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : "");

/** Map link that opens the phone's native maps app. */
export function directionsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
