import { hr } from "@/i18n/hr";
import { escalatesFromUrgency } from "./redFlags";
import type { CaseSummary } from "./schemas";

/**
 * The agent never sends a case on its own: when it wants to submit, the
 * patient first gets "Da, pošalji / Ne, želim nešto dodati". Exceptions:
 * the patient already said yes (button or "Da"), or the case is urgent
 * (emergencies are never delayed by a question).
 */
export function needsConfirmation(opts: {
  patientConfirmed: boolean;
  urgency: CaseSummary["urgency"] | undefined;
}): boolean {
  if (opts.patientConfirmed) return false;
  return !escalatesFromUrgency(opts.urgency);
}

/** A short typed "yes" to the confirmation question ("da", "može", "yes"…). */
export function isYes(text: string): boolean {
  const t = text
    .trim()
    .toLowerCase()
    .replace(/[.!,\s]+$/u, "");
  if (t.length > 40) return false;
  return (
    /^(da|može|moze|yes|ok|okej|u redu|pošalji|posalji|pošaljite|posaljite)(\b|[,!. ]|$)/u.test(
      t,
    ) && !/\b(ne|ali|no)\b/u.test(t.replace(/^da\b/u, ""))
  );
}

/** Was this assistant message the confirmation question? */
export function isConfirmQuestion(text: string | null | undefined): boolean {
  return Boolean(text?.trimEnd().endsWith(hr.chat.confirm.question));
}
