import { Compass } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Uputko logo mark. Dark mode: blue gradient tile with a white compass.
 * Light mode inverts it: white tile with a blue gradient compass.
 */
export function BrandMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid shrink-0 place-items-center bg-card shadow-soft ring-1 ring-border dark:shadow-none dark:ring-0 dark:bg-brand-gradient",
        size === "md" ? "size-11 rounded-2xl" : "size-10 rounded-xl",
        className,
      )}
    >
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="uputko-logo-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0028AB" />
            <stop offset="100%" stopColor="#4A89FF" />
          </linearGradient>
        </defs>
      </svg>
      <Compass
        className={cn(
          "logo-icon dark:stroke-white",
          size === "md" ? "size-6" : "size-5",
        )}
        strokeWidth={2.25}
      />
    </span>
  );
}
