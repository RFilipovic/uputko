import { describe, expect, it } from "vitest";
import {
  checkRedFlags,
  escalatesFromUrgency,
  normalize,
  type RedFlagId,
} from "./redFlags";

const hits = (text: string) => checkRedFlags(text).rules;
const expectRule = (text: string, rule: RedFlagId) =>
  expect(hits(text)).toContain(rule);
const expectNone = (text: string) =>
  expect(checkRedFlags(text).triggered).toBe(false);

describe("normalize", () => {
  it("folds diacritics and case", () => {
    expect(normalize("Gušim se, ŽELIM umrijeti! Đurđa")).toBe(
      "gusim se zelim umrijeti djurdja",
    );
  });
});

describe("chest_pain", () => {
  it.each([
    "jako me boli u prsima i ne mogu disati",
    "bol u prsima koja se širi u lijevu ruku",
    "stišće me u prsima, sav sam u hladnom znoju",
    "imam užasnu bol u prsima",
    "boli me u grudima i jedva dišem",
  ])("triggers: %s", (t) => expectRule(t, "chest_pain"));

  it.each([
    "nemam bolove u prsima, samo me boli grlo",
    "boli me uho već dva dana",
    "malo me peče žgaravica nakon jela",
  ])("does not trigger: %s", (t) =>
    expect(hits(t)).not.toContain("chest_pain"),
  );
});

describe("breathing", () => {
  it.each([
    "ne mogu disati",
    "dijete se guši",
    "ne može disati i plavi",
    "jedva dišem cijeli dan",
  ])("triggers: %s", (t) => expect(checkRedFlags(t).triggered).toBe(true));
  it.each([
    "malo sam zadihan nakon stepenica",
    "curi mi nos i kišem",
    "nemam problema s disanjem",
  ])("does not trigger: %s", (t) => expect(hits(t)).not.toContain("breathing"));
});

describe("stroke", () => {
  it.each([
    "mami se odjednom objesilo lice na jednu stranu",
    "lice mi je iskrivljeno",
    "utrnula mi je desna ruka i noga",
    "ne mogu pomaknuti lijevu ruku",
    "zapliće mi se jezik i govor mi je čudan",
  ])("triggers: %s", (t) => expectRule(t, "stroke"));
  it.each([
    "boli me ruka nakon vježbanja",
    "utrnuo mi je jučer prst na kompjuteru, sad je dobro",
  ])("does not trigger: %s", (t) => expect(hits(t)).not.toContain("stroke"));
});

describe("heavy_bleeding", () => {
  it.each([
    "jako krvarim iz rane i ne prestaje",
    "posjekao sam se, krvarenje ne mogu zaustaviti",
    "povraćam krv",
    "imam crnu stolicu od jutros",
  ])("triggers: %s", (t) => expectRule(t, "heavy_bleeding"));
  it.each(["malo mi je krvarilo desni pri pranju zubi", "nema krvarenja"])(
    "does not trigger: %s",
    (t) => expect(hits(t)).not.toContain("heavy_bleeding"),
  );
});

describe("suicidal", () => {
  it.each([
    "ne želim više živjeti",
    "razmišljam o samoubojstvu",
    "htio bih se ubiti",
    "želim umrijeti",
  ])("triggers: %s", (t) => expectRule(t, "suicidal"));
  it.each(["umirem od dosade na poslu", "ubija me ova glavobolja"])(
    "does not trigger: %s",
    (t) => expect(hits(t)).not.toContain("suicidal"),
  );
});

describe("unconscious", () => {
  it.each([
    "tata je izgubio svijest",
    "dijete ne reagira",
    "ne mogu ga probuditi",
    "beba ne diše",
  ])("triggers: %s", (t) => expectRule(t, "unconscious"));
  it.each(["nije gubio svijest, samo ga boli glava", "loše spavam"])(
    "does not trigger: %s",
    (t) => expect(hits(t)).not.toContain("unconscious"),
  );
});

describe("anaphylaxis", () => {
  it.each(["nakon uboda ose oteklo mi je grlo", "jezik mi otiče nakon lijeka"])(
    "triggers: %s",
    (t) => expectRule(t, "anaphylaxis"),
  );
  it.each(["oteklo mi je koljeno nakon pada", "grlo me boli"])(
    "does not trigger: %s",
    (t) => expect(hits(t)).not.toContain("anaphylaxis"),
  );
});

describe("seizure", () => {
  it.each([
    "sin ima epileptički napadaj",
    "dijete ima konvulzije",
    "ima napadaj i trese se",
  ])("triggers: %s", (t) => expectRule(t, "seizure"));
  it.each(["imam napadaj panike", "grčevi u trbuhu od jutros"])(
    "does not trigger: %s",
    (t) => expect(hits(t)).not.toContain("seizure"),
  );
});

describe("meningitis", () => {
  it.each([
    "dijete ima temperaturu 39 i ukočen vrat",
    "visoka vrućica i ne može sagnuti glavu",
  ])("triggers: %s", (t) => expectRule(t, "meningitis"));
  it.each([
    "ukočen mi je vrat od spavanja",
    "dijete ima temperaturu 38 i curi mu nos",
  ])("does not trigger: %s", (t) =>
    expect(hits(t)).not.toContain("meningitis"),
  );
});

describe("head_injury", () => {
  it.each([
    "pao je i udario glavom, sad povraća",
    "udarila sam se u glavu i zbunjena sam",
  ])("triggers: %s", (t) => expectRule(t, "head_injury"));
  it.each([
    "udario sam glavu o ormarić, imam malu kvrgu",
    "boli me glava od jutros",
  ])("does not trigger: %s", (t) =>
    expect(hits(t)).not.toContain("head_injury"),
  );
});

describe("poisoning", () => {
  it.each([
    "dijete je progutalo bateriju",
    "popila je cijelu kutiju tableta",
    "mislim da sam se predozirao",
    "sin je popio varikinu",
  ])("triggers: %s", (t) => expectRule(t, "poisoning"));
  it.each([
    "popio sam čaj i bolje mi je",
    "pojela sam nešto loše, malo me mučí trbuh",
  ])("does not trigger: %s", (t) => expect(hits(t)).not.toContain("poisoning"));
});

describe("pregnancy_bleeding", () => {
  it.each(["trudna sam i krvarim", "u trudnoći sam, pojavila se krv"])(
    "triggers: %s",
    (t) => expectRule(t, "pregnancy_bleeding"),
  );
  it.each(["trudna sam i muči me mučnina", "krvarenje iz nosa"])(
    "does not trigger: %s",
    (t) => expect(hits(t)).not.toContain("pregnancy_bleeding"),
  );
});

describe("everyday complaints stay calm", () => {
  it.each([
    "boli me zub, u Varaždinu sam, što da radim?",
    "dijete ima temperaturu 38.5 od jučer",
    "boli me uho dva dana",
    "imam osip na ruci",
    "kašljem već tjedan dana",
    "trebam uputnicu za kontrolu kod kardiologa",
  ])("no flag: %s", (t) => expectNone(t));
});

describe("escalatesFromUrgency", () => {
  it("escalates only on hitno", () => {
    expect(escalatesFromUrgency("hitno")).toBe(true);
    expect(escalatesFromUrgency("uskoro")).toBe(false);
    expect(escalatesFromUrgency("rutinski")).toBe(false);
    expect(escalatesFromUrgency(undefined)).toBe(false);
  });
});

describe("English (visitors and tourists)", () => {
  it.each<[string, RedFlagId]>([
    ["I have chest pain and I can't breathe", "chest_pain"],
    ["severe chest pain for 20 minutes", "chest_pain"],
    ["chest pain that spreads to my left arm", "chest_pain"],
    ["I can't breathe", "breathing"],
    ["my child is choking", "breathing"],
    ["her face is drooping on one side", "stroke"],
    ["he suddenly has slurred speech", "stroke"],
    ["I can't move my left arm", "stroke"],
    ["I'm bleeding heavily and it won't stop", "heavy_bleeding"],
    ["I've been vomiting blood", "heavy_bleeding"],
    ["I want to kill myself", "suicidal"],
    ["I don't want to live anymore", "suicidal"],
    ["my father passed out and is unresponsive", "unconscious"],
    ["my throat is swelling after a bee sting", "anaphylaxis"],
    ["my son had a seizure", "seizure"],
  ])("triggers: %s → %s", (t, rule) => expectRule(t, rule));

  it.each([
    "I have no chest pain, just a sore throat",
    "my ear hurts since two days",
    "I have a toothache, I'm in Split",
    "I'm a bit out of breath after running",
    "my child has a fever of 38",
  ])("does not trigger: %s", (t) => expectNone(t));
});
