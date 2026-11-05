import { Sparkles } from "lucide-react";
import { hr } from "@/i18n/hr";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  error?: boolean;
};

function Typing() {
  return (
    <span
      className="inline-flex items-center gap-1.5 py-2"
      aria-label={hr.chat.typing}
    >
      {[0, 150, 300].map((d) => (
        <span
          key={d}
          className="size-2.5 animate-bounce rounded-full bg-muted-foreground/70"
          style={{ animationDelay: `${d}ms` }}
        />
      ))}
    </span>
  );
}

/** Patient: violet bubble on the right. Uputko: plain large text with an icon, like chat apps. */
export function MessageBubble({
  message,
  typing = false,
}: {
  message: ChatMessage;
  typing?: boolean;
}) {
  if (message.role === "user") {
    return (
      <li className="flex animate-in justify-end duration-200 fade-in slide-in-from-bottom-1">
        <div className="max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-5 py-3.5 text-lg leading-relaxed whitespace-pre-wrap text-primary-foreground">
          <span className="sr-only">{hr.chat.you}: </span>
          {message.text}
        </div>
      </li>
    );
  }
  return (
    <li className="flex animate-in gap-3 duration-200 fade-in slide-in-from-bottom-1">
      <span
        aria-hidden
        className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full text-white bg-brand-gradient"
      >
        <Sparkles className="size-4" />
      </span>
      <div
        className={cn(
          "min-w-0 flex-1 pt-1 text-lg leading-relaxed whitespace-pre-wrap",
          message.error && "font-medium text-urgent",
        )}
      >
        <span className="sr-only">{hr.chat.assistant}: </span>
        {typing && !message.text ? <Typing /> : message.text}
      </div>
    </li>
  );
}
