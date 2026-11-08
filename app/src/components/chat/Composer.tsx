"use client";

import { SendHorizontal } from "lucide-react";
import { useEffect, useRef } from "react";
import { VoiceButton } from "@/components/chat/VoiceButton";
import { hr } from "@/i18n/hr";

/** Message box pinned to the bottom: grows with the text, Enter sends. */
export function Composer({
  value,
  onChange,
  onSend,
  autoVoice = false,
  disabled = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: (text: string) => void;
  autoVoice?: boolean;
  disabled?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function submit() {
    const text = value.trim();
    if (!text || disabled) return;
    onSend(text);
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-1.5 rounded-[1.75rem] border-2 border-input bg-card p-1.5 shadow-soft transition-colors focus-within:border-primary lg:gap-2 lg:rounded-[2rem] lg:p-2"
    >
      <label htmlFor="composer" className="sr-only">
        {hr.chat.inputLabel}
      </label>
      <textarea
        id="composer"
        ref={ref}
        rows={1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={hr.chat.placeholder}
        className="min-h-11 w-full min-w-0 flex-1 resize-none bg-transparent px-3 py-2.5 text-base leading-snug placeholder:text-muted-foreground focus-visible:outline-none lg:min-h-14 lg:px-4 lg:py-3.5 lg:text-lg"
      />
      <VoiceButton onTranscript={onChange} autoStart={autoVoice} />
      <button
        type="submit"
        disabled={!value.trim() || disabled}
        aria-label={hr.chat.send}
        title={hr.chat.send}
        className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-colors duration-200 hover:bg-primary-hover focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:bg-muted disabled:text-muted-foreground lg:size-14"
      >
        <SendHorizontal aria-hidden className="size-5 lg:size-6" />
      </button>
    </form>
  );
}
