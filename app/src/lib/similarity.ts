import { normalize } from "@/lib/agent/redFlags";

const bigrams = (s: string) => {
  const t = ` ${normalize(s)} `;
  const out = new Map<string, number>();
  for (let i = 0; i < t.length - 1; i++) out.set(t.slice(i, i + 2), (out.get(t.slice(i, i + 2)) ?? 0) + 1);
  return out;
};

/** Dice coefficient on character bigrams, diacritic-insensitive. 0..1 */
export function similarity(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  let inter = 0;
  let total = 0;
  for (const [k, v] of A) {
    inter += Math.min(v, B.get(k) ?? 0);
    total += v;
  }
  for (const v of B.values()) total += v;
  return total ? (2 * inter) / total : 0;
}

/** Best match above a threshold, or null. Also accepts containment ("ORL" ⊂ "...ORL..."). */
export function bestMatch<T>(query: string, items: T[], label: (t: T) => string, min = 0.45): T | null {
  const q = normalize(query);
  let best: T | null = null;
  let score = 0;
  for (const it of items) {
    const l = normalize(label(it));
    const s = l.includes(q) || q.includes(l) ? Math.max(0.9, similarity(q, l)) : similarity(q, l);
    if (s > score) {
      score = s;
      best = it;
    }
  }
  return score >= min ? best : null;
}
