import { describe, expect, it } from "vitest";
import { hr } from "@/i18n/hr";
import { isConfirmQuestion, isYes, needsConfirmation } from "./confirm";

describe("needsConfirmation", () => {
  it("asks the patient before a normal case is sent", () => {
    expect(
      needsConfirmation({ patientConfirmed: false, urgency: "rutinski" }),
    ).toBe(true);
    expect(
      needsConfirmation({ patientConfirmed: false, urgency: "uskoro" }),
    ).toBe(true);
  });
  it("does not ask again once the patient said yes", () => {
    expect(
      needsConfirmation({ patientConfirmed: true, urgency: "rutinski" }),
    ).toBe(false);
  });
  it("never delays an urgent case", () => {
    expect(
      needsConfirmation({ patientConfirmed: false, urgency: "hitno" }),
    ).toBe(false);
  });
});

describe("isYes", () => {
  it("accepts short yeses", () => {
    for (const t of [
      "Da",
      "da.",
      "Da, pošalji",
      "Može",
      "yes",
      "OK",
      "U redu",
      "Pošaljite",
    ])
      expect(isYes(t), t).toBe(true);
  });
  it("rejects no, additions and long messages", () => {
    for (const t of [
      "Ne",
      "Ne, želim nešto dodati",
      "Da, ali još me boli i grlo",
      "Dakle boli me i glava",
      "No",
      "da ".repeat(20),
    ])
      expect(isYes(t), t).toBe(false);
  });
});

describe("isConfirmQuestion", () => {
  it("recognises the question, also after other text", () => {
    expect(isConfirmQuestion(hr.chat.confirm.question)).toBe(true);
    expect(isConfirmQuestion(`Dobro.\n\n${hr.chat.confirm.question}`)).toBe(
      true,
    );
  });
  it("ignores other messages", () => {
    expect(isConfirmQuestion("Od kada vas boli?")).toBe(false);
    expect(isConfirmQuestion(null)).toBe(false);
  });
});
