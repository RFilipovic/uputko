import { Compass } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Uputko logo mark. Light mode: deep-blue compass on a white tile. Dark mode:
 * white compass on the white → deep-blue gradient tile.
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
      <Compass
        className={cn(
          "stroke-blue dark:stroke-white",
          size === "md" ? "size-6" : "size-5",
        )}
        strokeWidth={2.25}
      />
    </span>
  );
}
