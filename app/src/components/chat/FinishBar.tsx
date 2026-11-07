"use client";

import { Send } from "lucide-react";
import { hr } from "@/i18n/hr";
import { cn } from "@/lib/utils";

/**
 * "Pošalji liječniku": greyed out until the patient has said enough (one good
 * description or a few messages), then sends the case without more questions.
 */
export function FinishBar({
  ready,
  missing,
  busy,
  onFinish,
}: {
  ready: boolean;
  missing: string[];
  busy: boolean;
  onFinish: () => void;
}) {
  const disabled = !ready || busy;
  const wanted = missing.filter((m) => m !== "fever").slice(0, 2);
  const hint = ready
    ? hr.chat.finish.ready
    : wanted.length
      ? hr.chat.finish.missing(
          wanted.map((m) => hr.chat.finish.basics[m]).join(", "),
        )
      : hr.chat.finish.notReady;
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={onFinish}
        disabled={disabled}
        aria-describedby="finish-hint"
        className={cn(
          "inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-6 text-lg font-semibold transition-colors duration-200 focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none",
          disabled
            ? "cursor-not-allowed border-2 border-border bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground hover:bg-primary-hover",
        )}
      >
        <Send aria-hidden className="size-5" />
        {hr.chat.finish.button}
      </button>
      <p
        id="finish-hint"
        className="px-1 text-base text-muted-foreground"
        aria-live="polite"
      >
        {hint}
      </p>
    </div>
  );
}
