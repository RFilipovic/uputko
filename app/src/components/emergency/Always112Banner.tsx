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
      className="sticky top-0 z-30 flex min-h-14 items-center justify-center gap-3 bg-[color-mix(in_oklch,var(--primary)_10%,var(--background))] px-4 py-2 text-base font-semibold text-foreground focus-visible:ring-3 focus-visible:ring-urgent/50 focus-visible:outline-none focus-visible:ring-inset dark:bg-[color-mix(in_oklch,var(--primary)_22%,var(--background))]"
    >
      <span>{hr.emergency.banner}</span>
      <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-urgent-deep px-4 text-white lg:min-h-0 lg:rounded-none lg:bg-transparent lg:px-0 lg:font-bold lg:text-urgent-deep dark:lg:text-destructive">
        <Phone aria-hidden className="size-4" />
        {hr.emergency.call}
      </span>
    </a>
  );
}
