import { normalize } from "./redFlags";

/**
 * When may the patient press "Pošalji liječniku"? Deterministic, so the button
 * behaves predictably: either one good description (3 of the 5 basics) or a few
 * messages of any kind, so nobody gets stuck answering questions.
 */
export const BASICS = ["what", "where", "when", "howBad", "fever"] as const;
export type Basic = (typeof BASICS)[number];

const PATTERNS: Record<Basic, RegExp> = {
  what: /\b(bol\w*|boli|bole|probad\w*|pece|pecen\w*|svrb\w*|osip\w*|kasl\w*|kihan\w*|curi|temperatur\w*|vrucic\w*|povrac\w*|mucnin\w*|proljev\w*|zatvor\w*|otek\w*|otekl\w*|natek\w*|krvar\w*|vrtoglav\w*|umor\w*|slab\w*|glavobolj\w*|grc\w*|trnc\w*|utrnul\w*|zuj\w*|ne cujem|slabije cujem|ne vidim|ne mogu spavati|zgaravic\w*|crven\w*|gnoj\w*|rana|ranu|ozljed\w*|ugriz\w*|alergij\w*|tlak|secer)\b/,
  where:
    /\b(glav\w*|uho|uha|uhu|usi|oko|oka|oku|oci|ocima|zub\w*|desn\w*|grl\w*|vrat\w*|prs\w*|grud\w*|trbuh\w*|zelud\w*|led\w*|kraljez\w*|ruk\w*|nog\w*|koljen\w*|zglob\w*|kuk\w*|rame\w*|ramen\w*|stopal\w*|prst\w*|koz\w*|lic\w*|nos\w*|jezik\w*|mjehur\w*|mokr\w*|bubreg\w*|bubrez\w*|rodnic\w*|dojk\w*|celjust\w*|desno|lijevo|dolje|gore)\b/,
  when: /\b(\d+\s*(dan\w*|tjed\w*|mjesec\w*|sat\w*|godin\w*)|dan|dva dana|tri dana|danas|jucer|jutros|sinoc|vecer\w*|tjedan\w*|mjesec\w*|sat\w*|godin\w*|odjednom|naglo|od kada|vec|prije|stalno|povremeno)\b/,
  howBad:
    /\b(([1-9]|10)\s*(\/|od)\s*10|jako|jaka|jak|jace|blago|blaga|lagano|srednje|malo|nepodnosljiv\w*|uzasn\w*|strasn\w*|podnosljiv\w*|ne mogu (hodati|spavati|raditi))\b/,
  fever:
    /\b(temperatur\w*|vrucic\w*|groznic\w*|toplomjer\w*|3[5-9]([.,]\d)?|40)\b/,
};

/** Covering 3 of the 5 basics unlocks the button in one go. */
const BASICS_NEEDED = 3;
/** ...or this many patient messages of any kind. */
const MESSAGES_NEEDED = 3;

export type Readiness = {
  ready: boolean;
  covered: Basic[];
  missing: Basic[];
  messages: number;
};

export function readiness(userMessages: string[]): Readiness {
  const text = normalize(userMessages.join(" \n "));
  const covered = BASICS.filter((b) => PATTERNS[b].test(text));
  const messages = userMessages.filter((m) => m.trim().length > 0).length;
  return {
    ready: covered.length >= BASICS_NEEDED || messages >= MESSAGES_NEEDED,
    covered,
    missing: BASICS.filter((b) => !covered.includes(b)),
    messages,
  };
}
