// All UI strings live here (CLAUDE.md §2.2). Croatian first.
export const hr = {
  app: {
    name: "Uputko",
    tagline: "Opišite problem jednom. Ostalo rješavamo mi.",
    description:
      "Uputko vas vodi kroz zdravstveni sustav: kome se javiti, gdje i kada. Ne postavlja dijagnoze.",
    demoBadge: "Demo · sintetički podaci",
    homeLabel: "Uputko — početna",
  },
  landing: {
    title: "Što vas muči?",
    lead: "Opišite problem svojim riječima. Reći ćemo vam kome se javiti, gdje i kada.",
    cta: "Opišite problem",
    voice: "Ili recite naglas",
    stepsTitle: "Kako to radi",
    steps: [
      {
        title: "Opišete problem",
        body: "Pišući ili glasom, kao da pričate s osobom.",
      },
      {
        title: "Javimo vašem liječniku",
        body: "Liječnik dobije sažetak i odluči o uputnici.",
      },
      {
        title: "Dobijete termin",
        body: "S adresom, vremenom i što ponijeti.",
      },
    ],
  },
  settings: {
    largeText: "Veća slova",
  },
  emergency: {
    banner: "Hitan slučaj?",
    call: "Nazovi 112",
    callLabel: "Nazovi hitnu pomoć na 112",
  },
  disclaimer:
    "Uputko nije liječnik i ne postavlja dijagnozu. U hitnom slučaju odmah nazovite 112.",
} as const;
