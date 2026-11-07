import { describe, expect, it } from "vitest";
import { bestMatch } from "@/lib/similarity";

const specialties = [
  "Otorinolaringologija",
  "Kardiologija",
  "Dermatologija i venerologija",
  "Ginekologija i opstetricija",
  "Pedijatrija",
  "Reumatologija",
];
const strict = (q: string) => bestMatch(q, specialties, (s) => s, 0.8);

describe("bestMatch (strict, doctor portal nearby hospitals)", () => {
  it("matches the same specialty written differently", () => {
    expect(strict("otorinolaringologija (ORL)")).toBe("Otorinolaringologija");
    expect(strict("kardiologija")).toBe("Kardiologija");
    expect(strict("dermatologija")).toBe("Dermatologija i venerologija");
    expect(strict("ginekologija")).toBe("Ginekologija i opstetricija");
  });

  it("does not match a different specialty that only shares the ending", () => {
    expect(strict("stomatologija")).toBeNull();
    expect(strict("psihijatrija")).toBeNull();
  });
});
