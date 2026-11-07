import { describe, expect, it } from "vitest";
import { splitOptions, visibleText } from "./options";

describe("splitOptions", () => {
  it("extracts options from the last line", () => {
    expect(
      splitOptions("Imate li temperaturu?\nOPCIJE: Da | Ne | Ne znam"),
    ).toEqual({
      text: "Imate li temperaturu?",
      options: ["Da", "Ne", "Ne znam"],
    });
  });
  it("leaves plain text alone", () => {
    expect(splitOptions("Od kada vas boli?")).toEqual({
      text: "Od kada vas boli?",
      options: [],
    });
  });
  it("keeps at most 4 short options", () => {
    expect(splitOptions("x\nOPCIJE: a | b | c | d | e").options).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });
});

describe("visibleText", () => {
  it("hides a half-streamed options line", () => {
    expect(visibleText("Imate li temperaturu?\nOPC")).toBe(
      "Imate li temperaturu?",
    );
    expect(visibleText("Imate li temperaturu?\nOPCIJE: Da | N")).toBe(
      "Imate li temperaturu?",
    );
  });
  it("keeps normal words that start with O", () => {
    expect(visibleText("Hvala.\nOd kada traje?")).toBe(
      "Hvala.\nOd kada traje?",
    );
  });
});

describe("English chats (translated marker)", () => {
  it("accepts OPTIONS: as well as OPCIJE:", () => {
    expect(splitOptions("Do you have a fever?\nOPTIONS: Yes | No")).toEqual({
      text: "Do you have a fever?",
      options: ["Yes", "No"],
    });
  });
  it("hides a half-streamed OPTIONS line", () => {
    expect(visibleText("Do you have a fever?\nOPTI")).toBe(
      "Do you have a fever?",
    );
    expect(visibleText("Do you have a fever?\nOPTIONS: Ye")).toBe(
      "Do you have a fever?",
    );
  });
  it("does not hide an ordinary line starting with O", () => {
    expect(visibleText("Thanks.\nOne more question")).toBe(
      "Thanks.\nOne more question",
    );
  });
});
