import { distanceKm, type LatLng } from "@/lib/geo/distance";

/**
 * Deterministic routing (CLAUDE.md §2.5): the model classifies the complaint,
 * this code decides who handles it first.
 */
export const CATEGORIES = ["zub", "ginekolosko", "dijete", "ostalo"] as const;
export type Category = (typeof CATEGORIES)[number];

export const ROLES = ["obiteljski", "stomatolog", "ginekolog", "pedijatar"] as const;
export type Role = (typeof ROLES)[number];

const ROLE_BY_CATEGORY: Record<Category, Role> = {
  zub: "stomatolog",
  ginekolosko: "ginekolog",
  dijete: "pedijatar",
  ostalo: "obiteljski",
};

/** Open-data specialty code for each chosen-doctor role. */
export const SPECIALTY_BY_ROLE: Record<Role, string> = {
  obiteljski: "obiteljska-medicina",
  stomatolog: "dentalna-medicina",
  ginekolog: "ginekologija-pzz",
  pedijatar: "pedijatrija-pzz",
};

/** Categories a patient may use directly, without their own doctor, when away. */
const DIRECT_WHEN_AWAY: ReadonlySet<Category> = new Set(["zub"]);

/** Farther than this from home counts as "away" (student, traveller). */
export const AWAY_KM = 25;

export type RouteDecision =
  | { route: "direct"; role: Role; specialty: string; reason: "away_from_home" }
  | { route: "via_doctor"; role: Role; reason: "chosen_doctor" | "fallback_family_doctor" };

export function isAway(current: LatLng | null, home: LatLng | null): boolean {
  if (!current || !home) return false;
  return distanceKm(current, home) > AWAY_KM;
}

export function decideRoute(input: {
  category: Category;
  current: LatLng | null;
  home: LatLng | null;
  /** Roles the patient has a chosen doctor for. */
  chosenRoles: ReadonlySet<Role>;
}): RouteDecision {
  const role = ROLE_BY_CATEGORY[input.category];
  if (DIRECT_WHEN_AWAY.has(input.category) && isAway(input.current, input.home)) {
    return { route: "direct", role, specialty: SPECIALTY_BY_ROLE[role], reason: "away_from_home" };
  }
  if (input.chosenRoles.has(role)) {
    return { route: "via_doctor", role, reason: "chosen_doctor" };
  }
  // No chosen doctor for that role (e.g. no paediatrician): the family doctor triages.
  return { route: "via_doctor", role: "obiteljski", reason: "fallback_family_doctor" };
}
