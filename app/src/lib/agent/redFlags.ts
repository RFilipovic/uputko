/**
 * Deterministic red-flag rules (CLAUDE.md §2.5). Run on EVERY patient message
 * before the model sees it. Any hit stops the chat and shows 112 + the nearest
 * emergency department. Rules are deliberately broad: a false alarm costs a
 * moment, a missed emergency costs far more.
 *
 * Changing these rules requires updating redFlags.test.ts and stating the
 * behavioural change in the commit (CLAUDE.md §3 rule 6).
 */

export type RedFlagId =
  | "chest_pain"
  | "breathing"
  | "stroke"
  | "heavy_bleeding"
  | "suicidal"
  | "unconscious"
  | "anaphylaxis"
  | "seizure"
  | "meningitis"
  | "head_injury"
  | "poisoning"
  | "pregnancy_bleeding";

export type RedFlagResult = {
  triggered: boolean;
  rules: RedFlagId[];
};

/** Lowercase, strip Croatian diacritics, collapse whitespace. */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/đ/g, "dj")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Up to n filler words between two parts of a phrase.
const gap = (n: number) => `(?:\\S+\\s+){0,${n}}`;

// A match counts only if it is not negated just before ("nemam bolove u prsima").
const NEGATION =
  /\b(nema|nemam|nemamo|nemaju|nije|nisam|nismo|bez|nikakv\w*)\s+(?:\S+\s+){0,1}$/;

function affirmed(text: string, re: RegExp): boolean {
  const g = new RegExp(re.source, "g");
  for (const m of text.matchAll(g)) {
    const before = text.slice(Math.max(0, (m.index ?? 0) - 30), m.index);
    if (!NEGATION.test(before)) return true;
  }
  return false;
}

const R = {
  chestPain: new RegExp(
    `\\b(bol|boli|bole|bolov\\w*|probad\\w*|pece|stisc\\w*|stez\\w*|pritis\\w*|tisti)\\s+${gap(3)}(u\\s+)?(prs\\w*|grud\\w*|src\\w*)` +
      `|\\b(prs\\w*|grud\\w*)\\s+${gap(2)}(bol\\w*|boli|stisc\\w*|stez\\w*|pece)`,
  ),
  severeChest:
    /\b(jak\w*|uzasn\w*|strasn\w*|nepodnosljiv\w*)\s+(?:\S+\s+){0,2}bol\w*\s+(?:\S+\s+){0,2}(u\s+)?(prs|grud)/,
  breathing:
    /\b(ne mogu (da )?disat\w*|ne moze (da )?disat\w*|gusim se|gusi (me|se)|se gusi|ne dobivam zrak\w*|nemam zraka|ostao bez zraka|ostala bez zraka|ne mogu doci do zraka|jedva disem|jedva dise|tesko disem|tesko dise|nedostaje mi zraka|kratak dah|zadihan\w*)/,
  radiating:
    /\b(sir\w*|ide|zraci|zrace|seli)\s+(?:\S+\s+){0,3}(u\s+)?(ruk\w*|celjust\w*|vrat\w*|led\w*|lopatic\w*)/,
  sweatOrFaint:
    /\b(znoj\w*|hladan znoj|onesvijest\w*|nesvjest\w*|vrti mi se|mucnin\w*)/,
  faceDroop: new RegExp(
    `\\b(objesen\\w*|objesil\\w*|objesi|spusten\\w*|spustil\\w*|iskrivljen\\w*|iskrivil\\w*|krivo|ukoso|visi)\\s+${gap(2)}(lice|usta|usn\\w*|kut usana)` +
      `|\\b(lice|usta|usn\\w*)\\s+${gap(2)}(objesen\\w*|spusten\\w*|iskrivljen\\w*|krivo|visi)`,
  ),
  oneSideWeak: new RegExp(
    `\\b(utrnul\\w*|oduzet\\w*|obamrl\\w*|ne mogu (pomaknuti|podici|micati|pomaknut|dici)|ne moze (pomaknuti|podici|micati)|ne osjecam|slab\\w*)\\s+${gap(3)}(ruk\\w*|nog\\w*|stran\\w*|polovic\\w*|pola tijela|lice)`,
  ),
  speech:
    /\b(ne mogu (pricati|govoriti|izgovoriti)|ne moze (pricati|govoriti)|zaplice (mi |mu |joj )?(se )?jezik|nerazgovijetn\w*|govor (mi |mu |joj )?je (cudan|cudno|nejasan|cudna)|ne razumiju sto govorim|mijesa rijeci)/,
  heavyBleeding: new RegExp(
    `\\b(jako|obilno|puno|stalno|ne prestaje|ne mogu zaustaviti|ne staje|silno)\\s+${gap(3)}krvar\\w*` +
      `|\\bkrvar\\w*\\s+${gap(3)}(jako|obilno|ne prestaje|ne staje|ne mogu zaustaviti|bez prestanka)` +
      `|\\b(povraca\\w*|povracam|iskasljava\\w*|kaslje\\w*|kasljem|bljuje)\\s+${gap(2)}krv\\w*` +
      `|\\bcrn\\w* stolic\\w*|\\bkrv curi`,
  ),
  suicidal:
    /\b(ubit\w* se|ubiti se|se ubit\w*|samoubojstv\w*|ne zelim (vise )?zivjeti|ne zelim vise biti ziv\w*|nema smisla zivjeti|oduzeti si zivot|oduzet si zivot|naudit\w* (si|sebi)|nauditi (si|sebi)|prerezat\w* (si )?vene|skocit\w* (s|sa) |zelim umrijeti|htio bih umrijeti|htjela bih umrijeti)/,
  unconscious:
    /\b(izgubio svijest|izgubila svijest|izgubilo svijest|gubi svijest|gubim svijest|onesvijestio|onesvijestila|onesvijestilo|bez svijesti|ne reagira|ne budi se|ne mogu ga probuditi|ne mogu je probuditi|ne dise|prestao disati|prestala disati|plav\w* (u licu|usne|je))/,
  anaphylaxis: new RegExp(
    `\\b(otic\\w*|otek\\w*|otekl\\w*|natec\\w*|natekl\\w*|nateklo)\\s+${gap(2)}(grlo|jezik|usne|lice|gusa)` +
      `|\\b(grlo|jezik)\\s+${gap(2)}(otic\\w*|otek\\w*|otekl\\w*|natekl\\w*|zatvara)`,
  ),
  seizure:
    /\b(konvulzij\w*|epilepti\w*|napadaj(?! panike)|grcevi po cijelom tijelu|trese (ga|ju|je) i ne reagira|ima grceve i ne reagira|trza se i ne reagira)/,
  stiffNeck:
    /\b(ukocen\w*|ukrucen\w*|krut\w*|ne moze sagnuti|ne mogu sagnuti)\s+(?:\S+\s+){0,2}(vrat\w*|glav\w*)/,
  fever: /\b(temperatur\w*|vrucic\w*|groznic\w*|febril\w*|39|40)\b/,
  headHit:
    /\b(udari\w*|udario|udarila|pao|pala|palo|ozlijedi\w*|ozljed\w*)\s+(?:\S+\s+){0,4}glav\w*/,
  headDanger:
    /\b(povrac\w*|nesvijest\w*|onesvijest\w*|zbunjen\w*|pospan\w*|ne sjeca|ne sjecam|krv iz (nosa|uha)|bistra tekucina)/,
  poisoning:
    /\b(progutao|progutala|progutalo|popio|popila|popilo|pojeo|pojela|pojelo)\s+(?:\S+\s+){0,4}(puno|previse|cijelu|sve|kutiju|tablet\w*|lijekov\w*|otrov\w*|deterdzent\w*|varikin\w*|kemikalij\w*|baterij\w*|gljiv\w*)|\bpredozir\w*|\botrov(an|ala|ao|anje|ali)\b/,
  pregnant: /\btrudn\w*/,
  anyBleeding: /\b(krvar\w*|krv\w*)/,
};

/**
 * English rules for visitors and tourists (the chat answers in their language).
 * Fewer and simpler than the Croatian ones: the clearest emergencies only.
 */
const EN_NEGATION =
  /\b(no|not|dont|don t|never|without|isn t|isnt|haven t|havent)\s+(?:\S+\s+){0,1}$/;

function affirmedEn(text: string, re: RegExp): boolean {
  const g = new RegExp(re.source, "g");
  for (const m of text.matchAll(g)) {
    const before = text.slice(Math.max(0, (m.index ?? 0) - 30), m.index);
    if (!EN_NEGATION.test(before)) return true;
  }
  return false;
}

const EN = {
  chestPain:
    /\b(chest (pain|hurts|tightness|pressure)|pain in (my |the )?chest|crushing (pain|chest))/,
  severeChest: /\b(severe|terrible|crushing|unbearable) (\S+ ){0,2}chest pain/,
  breathing:
    /\b(can t breathe|cannot breathe|cant breathe|can t catch my breath|struggling to breathe|choking|gasping for air|not getting (any )?air)/,
  radiating: /\b(spreads?|radiat\w*|goes) (\S+ ){0,3}(arm|jaw|neck|back)/,
  sweat: /\b(sweating|cold sweat|faint\w*|dizzy|nause\w*)/,
  stroke:
    /\b(face (is )?(drooping|droops|droopy)|drooping face|one side of (my |his |her )?(face|body)|slurred speech|slurring|can t speak|cannot speak|cannot move (my |his |her )?(left |right )?(arm|leg|side)|can t move (my |his |her )?(left |right )?(arm|leg|side)|numb(ness)? (in|on) (one|my left|my right|the left|the right) side)/,
  heavyBleeding:
    /\b(bleeding (heavily|a lot|badly|won t stop|that won t stop|non stop)|heavy bleeding|can t stop (the )?bleeding|vomiting blood|coughing (up )?blood|throwing up blood)/,
  suicidal:
    /\b(kill myself|suicid\w*|end my life|want to die|don t want to live|dont want to live|hurt myself|harm myself)/,
  unconscious:
    /\b(unconscious|passed out|not breathing|stopped breathing|won t wake up|unresponsive|blue lips|turning blue)/,
  anaphylaxis:
    /\b((throat|tongue|lips|face) (is |are )?(swelling|swollen|closing)|swelling (of|in) (my |the )?(throat|tongue))/,
  seizure: /\b(seizure|convulsion\w*|fitting and not responding)/,
};

function checkEnglish(t: string, rules: RedFlagId[]) {
  const add = (id: RedFlagId) => {
    if (!rules.includes(id)) rules.push(id);
  };
  const chest = affirmedEn(t, EN.chestPain);
  if (
    affirmedEn(t, EN.severeChest) ||
    (chest &&
      (affirmedEn(t, EN.breathing) ||
        affirmedEn(t, EN.radiating) ||
        affirmedEn(t, EN.sweat)))
  )
    add("chest_pain");
  if (affirmedEn(t, EN.breathing) && !rules.includes("chest_pain"))
    add("breathing");
  if (affirmedEn(t, EN.stroke)) add("stroke");
  if (affirmedEn(t, EN.heavyBleeding)) add("heavy_bleeding");
  if (EN.suicidal.test(t)) add("suicidal");
  if (affirmedEn(t, EN.unconscious)) add("unconscious");
  if (affirmedEn(t, EN.anaphylaxis)) add("anaphylaxis");
  if (affirmedEn(t, EN.seizure)) add("seizure");
}

/** Evaluate one patient message. Pure and fast; safe to run on every turn. */
export function checkRedFlags(message: string): RedFlagResult {
  const t = normalize(message);
  const rules: RedFlagId[] = [];

  const chest = affirmed(t, R.chestPain);
  if (
    affirmed(t, R.severeChest) ||
    (chest &&
      (affirmed(t, R.breathing) ||
        affirmed(t, R.radiating) ||
        affirmed(t, R.sweatOrFaint)))
  ) {
    rules.push("chest_pain");
  }
  if (affirmed(t, R.breathing) && !rules.includes("chest_pain")) {
    // "kratak dah" / "zadihan" alone is common and mild; require a stronger phrase.
    if (
      /\b(ne mogu|ne moze|gusim|gusi|ne dobivam|nemam zraka|bez zraka|doci do zraka|jedva dis)/.test(
        t,
      )
    ) {
      rules.push("breathing");
    }
  }
  if (
    affirmed(t, R.faceDroop) ||
    affirmed(t, R.oneSideWeak) ||
    affirmed(t, R.speech)
  ) {
    rules.push("stroke");
  }
  if (affirmed(t, R.heavyBleeding)) rules.push("heavy_bleeding");
  if (R.suicidal.test(t)) rules.push("suicidal");
  if (affirmed(t, R.unconscious)) rules.push("unconscious");
  if (affirmed(t, R.anaphylaxis)) rules.push("anaphylaxis");
  if (affirmed(t, R.seizure)) rules.push("seizure");
  if (affirmed(t, R.stiffNeck) && affirmed(t, R.fever))
    rules.push("meningitis");
  if (affirmed(t, R.headHit) && affirmed(t, R.headDanger))
    rules.push("head_injury");
  if (affirmed(t, R.poisoning)) rules.push("poisoning");
  if (affirmed(t, R.pregnant) && affirmed(t, R.anyBleeding))
    rules.push("pregnancy_bleeding");
  checkEnglish(t, rules);

  return { triggered: rules.length > 0, rules };
}

/** The model's own urgency is the second safety layer: "hitno" escalates too. */
export function escalatesFromUrgency(
  urgency: string | null | undefined,
): boolean {
  return urgency === "hitno";
}
