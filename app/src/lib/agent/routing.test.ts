import { describe, expect, it } from "vitest";
import { decideRoute, isAway } from "./routing";

const OSIJEK = { lat: 45.555, lng: 18.6955 };
const VARAZDIN = { lat: 46.3057, lng: 16.3366 };
const OSIJEK_SUBURB = { lat: 45.53, lng: 18.66 };
const ALL = new Set([
  "obiteljski",
  "stomatolog",
  "ginekolog",
  "pedijatar",
] as const);

describe("isAway", () => {
  it("Osijek → Varaždin is away", () =>
    expect(isAway(VARAZDIN, OSIJEK)).toBe(true));
  it("a suburb is home", () =>
    expect(isAway(OSIJEK_SUBURB, OSIJEK)).toBe(false));
  it("unknown location is not away", () =>
    expect(isAway(null, OSIJEK)).toBe(false));
});

describe("decideRoute", () => {
  it("toothache away from home goes direct to the nearest dentist", () => {
    expect(
      decideRoute({
        category: "zub",
        current: VARAZDIN,
        home: OSIJEK,
        chosenRoles: ALL,
      }),
    ).toMatchObject({
      route: "direct",
      role: "stomatolog",
      specialty: "dentalna-medicina",
    });
  });
  it("toothache at home goes to the chosen dentist", () => {
    expect(
      decideRoute({
        category: "zub",
        current: OSIJEK,
        home: OSIJEK,
        chosenRoles: ALL,
      }),
    ).toEqual({
      route: "via_doctor",
      role: "stomatolog",
      reason: "chosen_doctor",
    });
  });
  it("ear pain away from home still goes to the family doctor", () => {
    expect(
      decideRoute({
        category: "ostalo",
        current: VARAZDIN,
        home: OSIJEK,
        chosenRoles: ALL,
      }).route,
    ).toBe("via_doctor");
  });
  it.each([
    ["ginekolosko", "ginekolog"],
    ["dijete", "pedijatar"],
    ["ostalo", "obiteljski"],
  ] as const)("%s → %s", (category, role) => {
    expect(
      decideRoute({ category, current: null, home: OSIJEK, chosenRoles: ALL })
        .role,
    ).toBe(role);
  });
  it("sick child without a chosen paediatrician falls back to the family doctor", () => {
    expect(
      decideRoute({
        category: "dijete",
        current: null,
        home: OSIJEK,
        chosenRoles: new Set(["obiteljski"]),
      }),
    ).toEqual({
      route: "via_doctor",
      role: "obiteljski",
      reason: "fallback_family_doctor",
    });
  });
});
