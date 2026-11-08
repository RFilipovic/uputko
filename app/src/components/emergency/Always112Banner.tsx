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
      className="sticky top-0 z-30 flex min-h-11 items-center justify-center gap-2.5 bg-[color-mix(in_oklch,var(--primary)_10%,var(--background))] px-4 py-1.5 text-sm font-semibold text-foreground focus-visible:ring-3 focus-visible:ring-urgent/50 focus-visible:outline-none focus-visible:ring-inset lg:min-h-14 lg:gap-3 lg:py-2 lg:text-base"
    >
      <span>{hr.emergency.banner}</span>
      <span className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-urgent-deep px-3 text-white lg:min-h-0 lg:gap-2 lg:rounded-none lg:bg-transparent lg:px-0 lg:font-bold lg:text-urgent-deep">
        <Phone aria-hidden className="size-4" />
        {hr.emergency.call}
      </span>
    </a>
  );
}
