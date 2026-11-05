import { hr } from "@/i18n/hr";
import { cn } from "@/lib/utils";

export type ChatMessage = { id: string; role: "user" | "assistant"; text: string; error?: boolean };

/** One chat bubble. Assistant bubbles show a typing indicator until text arrives. */
export function MessageBubble({ message, typing = false }: { message: ChatMessage; typing?: boolean }) {
  const mine = message.role === "user";
  return (
    <li className={cn("animate-in fade-in slide-in-from-bottom-1 flex duration-200", mine ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[88%] rounded-3xl px-5 py-3.5 text-lg leading-relaxed whitespace-pre-wrap",
          mine ? "rounded-br-lg bg-primary text-primary-foreground" : "rounded-bl-lg border border-border bg-card shadow-soft",
          message.error && "border-urgent/40 bg-urgent/5",
        )}
      >
        <span className="sr-only">{mine ? hr.chat.you : hr.chat.assistant}: </span>
        {typing && !message.text ? (
          <span className="inline-flex items-center gap-1.5 py-2" aria-label={hr.chat.typing}>
            {[0, 150, 300].map((d) => (
              <span
                key={d}
                className="size-2.5 animate-bounce rounded-full bg-muted-foreground/70"
                style={{ animationDelay: `${d}ms` }}
              />
            ))}
          </span>
        ) : (
          message.text
        )}
      </div>
    </li>
  );
}
