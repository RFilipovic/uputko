import { Phone } from "lucide-react";
import { hr } from "@/i18n/hr";

/** Persistent, calm emergency bar shown from the first screen. */
export function Always112Banner() {
  return (
    <a
      href="tel:112"
      aria-label={hr.emergency.callLabel}
      className="flex min-h-14 items-center justify-center gap-3 bg-urgent/10 px-4 py-2 text-base font-semibold text-urgent focus-visible:ring-3 focus-visible:ring-urgent/50 focus-visible:outline-none focus-visible:ring-inset dark:bg-urgent/20 dark:text-foreground"
    >
      <span>{hr.emergency.banner}</span>
      <span className="inline-flex min-h-10 items-center gap-2 rounded-full bg-urgent px-4 text-urgent-foreground">
        <Phone aria-hidden className="size-4" />
        {hr.emergency.call}
      </span>
    </a>
  );
}
