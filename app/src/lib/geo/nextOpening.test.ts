import { describe, expect, it } from "vitest";
import { nextOpening, zagrebNow } from "./nextOpening";

// Weekday practice: mornings Mon–Fri 07–14.
const mornings = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  opens: "07:00:00",
  closes: "14:00:00",
}));

describe("nextOpening", () => {
  it("later today", () => {
    expect(nextOpening(mornings, { weekday: 2, time: "06:30" })).toBe(
      "danas u 7:00",
    );
  });
  it("tomorrow after closing time", () => {
    expect(nextOpening(mornings, { weekday: 2, time: "18:00" })).toBe(
      "sutra u 7:00",
    );
  });
  it("Saturday evening → Monday", () => {
    expect(nextOpening(mornings, { weekday: 6, time: "18:00" })).toBe(
      "ponedjeljak u 7:00",
    );
  });
  it("Friday evening → Monday (by name, not 'sutra')", () => {
    expect(nextOpening(mornings, { weekday: 5, time: "20:00" })).toBe(
      "ponedjeljak u 7:00",
    );
  });
  it("no hours known", () => {
    expect(nextOpening([], { weekday: 1, time: "10:00" })).toBeNull();
  });
});

describe("zagrebNow", () => {
  it("uses Zagreb time, not UTC", () => {
    // 2026-11-09 is a Monday; 23:30 UTC is already Tuesday 00:30 in Zagreb.
    expect(zagrebNow(new Date("2026-11-09T23:30:00Z"))).toEqual({
      weekday: 2,
      time: "00:30",
    });
  });
});
