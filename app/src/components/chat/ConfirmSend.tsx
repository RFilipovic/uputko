"use client";

import { PencilLine, Send } from "lucide-react";
import { hr } from "@/i18n/hr";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";

// Same compact phone sizes as the rest of the chat.
const size =
  "min-h-11 rounded-xl px-4 text-base lg:min-h-14 lg:rounded-2xl lg:px-6 lg:text-lg";

/** The patient decides when the case goes to the doctor, never the agent. */
export function ConfirmSend({
  onYes,
  onNo,
  disabled = false,
}: {
  onYes: () => void;
  onNo: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex animate-in flex-col gap-2 duration-200 fade-in slide-in-from-bottom-1 sm:flex-row">
      <button
        type="button"
        onClick={onYes}
        disabled={disabled}
        className={cn(ui.btnPrimary, size, "sm:flex-1")}
      >
        <Send aria-hidden className="size-4 lg:size-5" />
        {hr.chat.confirm.yes}
      </button>
      <button
        type="button"
        onClick={onNo}
        disabled={disabled}
        className={cn(ui.btnSecondary, size, "sm:flex-1")}
      >
        <PencilLine aria-hidden className="size-4 lg:size-5" />
        {hr.chat.confirm.no}
      </button>
    </div>
  );
}
