import { describe, expect, it } from "vitest";
import { readiness } from "./readiness";

describe("readiness — when the 'Pošalji liječniku' button unlocks", () => {
  it.each([
    "Boli me uho već dva dana, oko 5 od 10, nemam temperaturu",
    "Jako me boli zub od jučer",
    "Dijete ima temperaturu 38,5 od jutros i kašlje",
    "Imam osip na ruci već tjedan dana, malo svrbi",
  ])("one good message unlocks it: %s", (m) => {
    expect(readiness([m]).ready).toBe(true);
  });

  it.each(["Boli me", "Loše mi je", "Trebam pomoć", "Boli me uho"])(
    "one hollow message does not: %s",
    (m) => {
      expect(readiness([m]).ready).toBe(false);
    },
  );

  it("a few hollow messages unlock it too", () => {
    expect(readiness(["Loše mi je", "Ne znam"]).ready).toBe(false);
    expect(readiness(["Loše mi je", "Ne znam", "Ne znam baš"]).ready).toBe(
      true,
    );
  });

  it("basics add up across messages", () => {
    expect(readiness(["Boli me uho", "Od jučer"]).ready).toBe(true);
  });

  it("reports what is still missing", () => {
    const r = readiness(["Boli me uho"]);
    expect(r.covered).toEqual(["what", "where"]);
    expect(r.missing).toEqual(["when", "howBad", "fever"]);
  });

  it("ignores empty messages", () => {
    expect(readiness(["", " ", "Boli me"]).messages).toBe(1);
  });
});
