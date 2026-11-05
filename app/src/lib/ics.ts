/** Minimal RFC 5545 calendar file for one appointment. */
export function buildIcs(e: {
  uid: string;
  start: string;
  end: string;
  title: string;
  location: string;
  description: string;
}): string {
  const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  // Lines longer than 75 octets are folded (RFC 5545 §3.1).
  const fold = (line: string) => {
    const out: string[] = [];
    let rest = line;
    while (Buffer.byteLength(rest) > 75) {
      let cut = 75;
      while (Buffer.byteLength(rest.slice(0, cut)) > 75) cut--;
      out.push(rest.slice(0, cut));
      rest = " " + rest.slice(cut);
    }
    out.push(rest);
    return out.join("\r\n");
  };
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Uputko//Demo//HR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${e.uid}@uputko`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(e.start)}`,
    `DTEND:${stamp(e.end)}`,
    `SUMMARY:${esc(e.title)}`,
    `LOCATION:${esc(e.location)}`,
    `DESCRIPTION:${esc(e.description)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${esc(e.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(fold)
    .join("\r\n");
}
