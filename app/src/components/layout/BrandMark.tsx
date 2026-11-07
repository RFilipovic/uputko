import { Compass } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Uputko logo mark on the brand gradient tile. Light mode: blue → white tile
 * with a blue compass. Dark mode: flipped tile (white → blue), white compass.
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
        "grid shrink-0 place-items-center bg-brand-gradient",
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
