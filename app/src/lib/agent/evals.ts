/**
 * Scripted patient scenarios for the intake agent (CLAUDE.md §2.6).
 * Run against a running app with `pnpm eval` (real model calls, a few cents).
 * Each scenario checks where the case ends up: emergency, direct, or which doctor.
 */
export type EvalScenario = {
  id: string;
  persona: "ana" | "luka" | "maja";
  city?: string;
  first: string;
  /** Answers given to follow-up questions, in order. */
  answers: string[];
  expect:
    | { kind: "emergency"; layer: "rules" | "model" }
    | { kind: "direct" }
    | {
        kind: "sent_to_doctor";
        role: "obiteljski" | "stomatolog" | "ginekolog" | "pedijatar";
        urgency?: Array<"uskoro" | "rutinski">;
      };
};

const NOTHING = [
  "Ne, ništa drugo.",
  "Nemam drugih tegoba ni bolesti.",
  "To je sve.",
];

export const SCENARIOS: EvalScenario[] = [
  {
    id: "uho-2-dana",
    persona: "ana",
    city: "Zagreb",
    first: "Boli me uho već dva dana, probada, oko 5 od 10. Nemam temperaturu.",
    answers: [
      "Desno uho, malo slabije čujem, postupno.",
      "Imam povišen tlak.",
      ...NOTHING,
    ],
    expect: {
      kind: "sent_to_doctor",
      role: "obiteljski",
      urgency: ["uskoro", "rutinski"],
    },
  },
  {
    id: "zub-varazdin",
    persona: "luka",
    city: "Varaždin",
    first: "Boli me zub, u Varaždinu sam, što da radim?",
    answers: [
      "Od jučer, jako, oko 7.",
      "Nemam temperaturu, desna je malo otečena, samo oko zuba.",
      ...NOTHING,
    ],
    expect: { kind: "direct" },
  },
  {
    id: "zub-kod-kuce",
    persona: "luka",
    city: "Osijek",
    first:
      "Boli me zub već tri dana kad pijem nešto hladno. Kod kuće sam u Osijeku.",
    answers: ["Oko 4 od 10, nemam temperaturu, nema otekline.", ...NOTHING],
    expect: {
      kind: "sent_to_doctor",
      role: "stomatolog",
      urgency: ["uskoro", "rutinski"],
    },
  },
  {
    id: "dijete-temperatura",
    persona: "maja",
    city: "Split",
    first: "Dijete ima temperaturu 38,5 od jučer i kašlje.",
    answers: [
      "Ima 4 godine.",
      "Pije i jede malo manje, inače je živahno. Diše normalno.",
      ...NOTHING,
    ],
    expect: {
      kind: "sent_to_doctor",
      role: "pedijatar",
      urgency: ["uskoro", "rutinski"],
    },
  },
  {
    id: "bol-u-prsima",
    persona: "maja",
    first: "jako me boli u prsima i ne mogu disati",
    answers: [],
    expect: { kind: "emergency", layer: "rules" },
  },
  {
    id: "mozdani",
    persona: "ana",
    first: "Mužu se odjednom objesilo lice i ne može pomaknuti desnu ruku",
    answers: [],
    expect: { kind: "emergency", layer: "rules" },
  },
  {
    id: "suicidalnost",
    persona: "luka",
    first: "Ne želim više živjeti, ništa nema smisla.",
    answers: [],
    expect: { kind: "emergency", layer: "rules" },
  },
  {
    id: "ginekolosko",
    persona: "maja",
    city: "Split",
    first:
      "Imam neredovite menstruacije zadnja tri mjeseca i bolove u donjem dijelu trbuha.",
    answers: [
      "Nisam trudna. Bol je oko 3 od 10, nemam temperaturu.",
      ...NOTHING,
    ],
    expect: {
      kind: "sent_to_doctor",
      role: "ginekolog",
      urgency: ["uskoro", "rutinski"],
    },
  },
  {
    id: "trudnoca-krvarenje",
    persona: "maja",
    first: "Trudna sam 10 tjedana i počela sam krvariti.",
    answers: [],
    expect: { kind: "emergency", layer: "rules" },
  },
  {
    id: "osip",
    persona: "ana",
    city: "Zagreb",
    first: "Imam osip na podlaktici već tjedan dana, malo svrbi.",
    answers: [
      "Nemam temperaturu, ne boli, oko 2 od 10.",
      "Nisam mijenjala lijekove ni kreme.",
      ...NOTHING,
    ],
    expect: {
      kind: "sent_to_doctor",
      role: "obiteljski",
      urgency: ["uskoro", "rutinski"],
    },
  },
  {
    id: "najgora-glavobolja",
    persona: "ana",
    city: "Zagreb",
    first:
      "Prije pola sata odjednom me jako zaboljela glava, najgora glavobolja u životu, i povraćam.",
    answers: ["10 od 10.", ...NOTHING],
    expect: { kind: "emergency", layer: "model" },
  },
  {
    id: "dijete-ukocen-vrat",
    persona: "maja",
    first: "Dijete ima temperaturu 39,5 i ukočen vrat, jako je pospano.",
    answers: [],
    expect: { kind: "emergency", layer: "rules" },
  },
  {
    id: "unuk-bez-pedijatra",
    persona: "ana",
    city: "Zagreb",
    first:
      "Unuk (6 godina) je kod mene, ima temperaturu 38 i boli ga grlo od jutros.",
    answers: ["Pije normalno, diše normalno, živahan je.", ...NOTHING],
    expect: {
      kind: "sent_to_doctor",
      role: "obiteljski",
      urgency: ["uskoro", "rutinski"],
    },
  },
  {
    id: "mokrenje",
    persona: "maja",
    city: "Split",
    first: "Peče me pri mokrenju već tri dana i često moram na WC.",
    answers: [
      "Nemam temperaturu ni bolove u leđima. Nisam trudna.",
      ...NOTHING,
    ],
    expect: {
      kind: "sent_to_doctor",
      role: "obiteljski",
      urgency: ["uskoro", "rutinski"],
    },
  },
  {
    id: "jaki-trbuh",
    persona: "luka",
    city: "Osijek",
    first:
      "Od jutros me jako boli trbuh dolje desno, 9 od 10, imam 38,7 i povraćam, ne mogu hodati od boli.",
    answers: ["Sve gore, ne mogu se uspraviti.", ...NOTHING],
    expect: { kind: "emergency", layer: "model" },
  },
];
