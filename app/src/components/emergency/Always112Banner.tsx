import { Phone } from "lucide-react";
import { hr } from "@/i18n/hr";

/**
 * Persistent, calm emergency bar shown from the first screen. It stays pinned
 * to the top while the page scrolls (solid background, so text stays readable).
 */
export function Always112Banner() {
  return (
    <a
      href="tel:112"
      aria-label={hr.emergency.callLabel}
      className="sticky top-0 z-30 flex min-h-14 items-center justify-center gap-3 bg-[color-mix(in_oklch,var(--urgent)_10%,var(--background))] px-4 py-2 text-base font-semibold text-urgent-deep focus-visible:ring-3 focus-visible:ring-urgent/50 focus-visible:outline-none focus-visible:ring-inset dark:bg-[color-mix(in_oklch,var(--urgent)_20%,var(--background))] dark:text-foreground"
    >
      <span>{hr.emergency.banner}</span>
      <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-urgent-deep px-4 text-white">
        <Phone aria-hidden className="size-4" />
        {hr.emergency.call}
      </span>
    </a>
  );
}
