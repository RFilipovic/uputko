"use client";

import { cn } from "@/lib/utils";

/** Big tappable answers: a stacked list (start screen) or wrapping chips (in chat). */
export function QuickReplies({
  options,
  onPick,
  variant = "list",
  disabled = false,
}: {
  options: readonly string[];
  onPick: (text: string) => void;
  variant?: "list" | "chips";
  disabled?: boolean;
}) {
  return (
    <ul className={cn(variant === "list" ? "flex flex-col gap-2" : "flex flex-wrap gap-2")}>
      {options.map((o) => (
        <li key={o} className={variant === "list" ? "" : "min-w-0"}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(o)}
            className={cn(
              "flex min-h-14 items-center rounded-2xl border-2 bg-card px-5 text-left text-lg font-semibold transition-colors duration-200 hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50",
              variant === "list" ? "w-full border-border" : "border-primary/40 text-primary dark:text-foreground",
            )}
          >
            {o}
          </button>
        </li>
      ))}
    </ul>
  );
}
