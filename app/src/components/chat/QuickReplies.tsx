"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Shared id so a tapped chip can morph into the patient's message bubble. */
export const replyLayoutId = (scope: number, text: string) =>
  `reply-${scope}-${text}`;

/** Big tappable answers: a stacked list (start screen) or wrapping chips (in chat). */
export function QuickReplies({
  options,
  onPick,
  variant = "list",
  disabled = false,
  scope = 0,
}: {
  options: readonly string[];
  onPick: (text: string) => void;
  variant?: "list" | "chips";
  disabled?: boolean;
  /** Which question these answers belong to (keeps morph ids unique). */
  scope?: number;
}) {
  return (
    <ul
      className={cn(
        variant === "list" ? "flex flex-col gap-2" : "flex flex-wrap gap-2",
      )}
    >
      {options.map((o) => (
        <li key={o} className={variant === "list" ? "" : "min-w-0"}>
          <motion.button
            layoutId={replyLayoutId(scope, o)}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            whileTap={{ scale: 0.97 }}
            type="button"
            disabled={disabled}
            onClick={() => onPick(o)}
            className={cn(
              "flex min-h-11 items-center rounded-xl border-2 bg-card px-4 py-1.5 text-left text-base font-semibold transition-colors duration-200 hover:border-primary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:opacity-50 lg:min-h-14 lg:rounded-2xl lg:px-5 lg:py-0 lg:text-lg",
              variant === "list"
                ? "w-full border-border"
                : "border-primary/40 text-primary",
            )}
          >
            {o}
          </motion.button>
        </li>
      ))}
    </ul>
  );
}
