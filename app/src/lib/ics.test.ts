import { describe, expect, it } from "vitest";
import { buildIcs } from "./ics";
import { formatWhen } from "./format";

describe("buildIcs", () => {
  const ics = buildIcs({
    uid: "abc",
    start: "2026-11-10T08:30:00Z",
    end: "2026-11-10T09:00:00Z",
    title: "ORL pregled, KB Dubrava",
    location: "Avenija Gojka Šuška 6, Zagreb",
    description: "Ponesite uputnicu; osobnu iskaznicu",
  });
  it("has UTC times and escapes separators", () => {
    expect(ics).toContain("DTSTART:20261110T083000Z");
    expect(ics).toContain("SUMMARY:ORL pregled\\, KB Dubrava");
    expect(ics).toContain("Ponesite uputnicu\; osobnu");
  });
  it("uses CRLF and folds long lines", () => {
    expect(ics.includes("\r\n")).toBe(true);
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
  });
});

describe("formatWhen", () => {
  it("formats in Croatian, Zagreb time", () => {
    expect(formatWhen("2026-11-10T08:30:00Z")).toBe("utorak, 10. 11. u 9:30");
    expect(formatWhen("2026-11-06T09:00:00Z")).toBe("petak, 6. 11. u 10:00");
  });
});
