import { Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { hr } from "@/i18n/hr";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  error?: boolean;
  /**
   * On a failed reply: "again" re-asks the server about the saved message,
   * "resend" sends the patient's text again (it never reached the server).
   */
  retry?: { mode: "again" | "resend"; text: string };
  /** Set when the message came from a tapped quick reply: the chip morphs into this bubble. */
  layoutId?: string;
};

/** Three dots in a soft wave, so a wait never looks frozen. */
function Typing() {
  return (
    <span
      role="status"
      className="inline-flex items-center gap-1.5 py-2"
      aria-label={hr.chat.typing}
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-2.5 rounded-full bg-primary/70 dark:bg-foreground/70"
          animate={{ y: [0, -5, 0], opacity: [0.45, 1, 0.45] }}
          transition={{
            duration: 1.1,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.16,
          }}
        />
      ))}
    </span>
  );
}

/** Blinking caret at the end of a reply while it is still streaming. */
function Caret() {
  return (
    <motion.span
      aria-hidden
      className="ml-0.5 inline-block h-[1.1em] w-[3px] translate-y-[3px] rounded-full bg-primary dark:bg-foreground"
      animate={{ opacity: [1, 0, 1] }}
      transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
    />
  );
}

/** Patient: blue bubble on the right. Uputko: plain large text with an icon, like chat apps. */
export function MessageBubble({
  message,
  typing = false,
}: {
  message: ChatMessage;
  typing?: boolean;
}) {
  if (message.role === "user") {
    return (
      <li
        className={cn(
          "flex justify-end",
          !message.layoutId &&
            "animate-in duration-200 fade-in slide-in-from-bottom-1",
        )}
      >
        <motion.div
          layoutId={message.layoutId}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          className="max-w-[85%] rounded-3xl rounded-br-lg bg-primary px-5 py-3.5 text-lg leading-relaxed whitespace-pre-wrap text-primary-foreground"
        >
          <span className="sr-only">{hr.chat.you}: </span>
          {message.text}
        </motion.div>
      </li>
    );
  }
  return (
    <li className="flex animate-in gap-3 duration-200 fade-in slide-in-from-bottom-1">
      <span
        aria-hidden
        className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full text-blue bg-brand-gradient"
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
        {typing && !message.text ? (
          <Typing />
        ) : (
          <>
            {message.text}
            {typing && <Caret />}
          </>
        )}
      </div>
    </li>
  );
}
