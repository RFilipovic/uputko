"use client";

import { RefreshCw, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Composer } from "@/components/chat/Composer";
import { LocationBar, type ChatLocation } from "@/components/chat/LocationBar";
import {
  MessageBubble,
  type ChatMessage,
} from "@/components/chat/MessageBubble";
import { OutcomeCard } from "@/components/chat/OutcomeCard";
import { QuickReplies, replyLayoutId } from "@/components/chat/QuickReplies";
import { FinishBar } from "@/components/chat/FinishBar";
import { EmergencyTakeover } from "@/components/emergency/EmergencyTakeover";
import { hr } from "@/i18n/hr";
import { visibleText } from "@/lib/agent/options";
import type { Outcome } from "@/lib/agent/outcome";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";

let seq = 0;
const nextId = () => `m${++seq}`;

/** Parse one server-sent event block ("event: x\ndata: {...}"). */
function parseEvent(
  block: string,
): { event: string; data: Record<string, unknown> } | null {
  let event = "message";
  let data = "";
  for (const line of block.split("\n")) {
    if (line.startsWith("event: ")) event = line.slice(7).trim();
    else if (line.startsWith("data: ")) data += line.slice(6);
  }
  if (!data) return null;
  try {
    return { event, data: JSON.parse(data) as Record<string, unknown> };
  } catch {
    return null;
  }
}

/**
 * The intake conversation. Streams the assistant reply token by token; the
 * server runs the emergency rules before any model call.
 */
export function ChatScreen({
  autoVoice = false,
  patientName,
}: {
  autoVoice?: boolean;
  patientName: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [caseId, setCaseId] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [location, setLocation] = useState<ChatLocation | null>(null);
  const [locationSent, setLocationSent] = useState(false);
  const [locationSkipped, setLocationSkipped] = useState(false);
  const [ready, setReady] = useState<{ ready: boolean; missing: string[] }>({
    ready: false,
    missing: [],
  });
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Follow the conversation; the empty welcome screen stays at the top.
    if (messages.length === 0) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    endRef.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "end",
    });
  }, [messages, options, outcome]);

  function patchAssistant(id: string, patch: Partial<ChatMessage>) {
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  }

  async function send(
    text: string,
    finish = false,
    fromChip = false,
    again = false,
  ) {
    const message = finish ? hr.chat.finishMessage : text.trim();
    if (!message || busy || outcome) return;
    const replyId = nextId();
    if (again) {
      // Same question again: replace the failed reply, keep the patient's bubble.
      setMessages((ms) => [
        ...ms.slice(0, -1),
        { id: replyId, role: "assistant", text: "" },
      ]);
    } else {
      setMessages((ms) => [
        ...ms,
        {
          id: nextId(),
          role: "user",
          text: message,
          layoutId: fromChip
            ? replyLayoutId(messages.length, message)
            : undefined,
        },
        { id: replyId, role: "assistant", text: "" },
      ]);
    }
    setDraft("");
    setOptions([]);
    setBusy(true);

    let raw = "";
    let gotOutcome: Outcome | null = null;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId: caseId ?? undefined,
          message: finish || again ? undefined : message,
          finish,
          retry: again,
          location: location && !locationSent ? location : undefined,
        }),
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as {
          message?: string;
        } | null;
        patchAssistant(replyId, {
          text: body?.message ?? hr.chat.errors.generic,
          error: true,
        });
        return;
      }
      if (location) setLocationSent(true);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let cut: number;
        while ((cut = buffer.indexOf("\n\n")) !== -1) {
          const ev = parseEvent(buffer.slice(0, cut));
          buffer = buffer.slice(cut + 2);
          if (!ev) continue;
          if (ev.event === "case") setCaseId(String(ev.data.caseId));
          else if (ev.event === "ready") {
            setReady({
              ready: Boolean(ev.data.ready),
              missing: (ev.data.missing as string[]) ?? [],
            });
          } else if (ev.event === "delta") {
            raw += String(ev.data.text ?? "");
            patchAssistant(replyId, { text: visibleText(raw) });
          } else if (ev.event === "options")
            setOptions((ev.data.options as string[]) ?? []);
          else if (ev.event === "outcome") {
            gotOutcome = ev.data.outcome as Outcome;
            setOutcome(gotOutcome);
            if (gotOutcome.kind === "emergency") setShowEmergency(true);
          } else if (ev.event === "error") {
            patchAssistant(replyId, {
              text: String(ev.data.message ?? hr.chat.errors.generic),
              error: true,
              // The message is saved: ask the server to answer it again.
              retry: finish ? undefined : { mode: "again", text: message },
            });
          }
        }
      }
      const finalOutcome = gotOutcome as Outcome | null;
      if (!raw.trim() && finalOutcome?.kind === "emergency") {
        patchAssistant(replyId, { text: hr.emergency.chatText, error: true });
      }
    } catch {
      patchAssistant(replyId, {
        text: hr.chat.errors.offline,
        error: true,
        // A first try may never have arrived: send the text again. A retry
        // of a saved message asks the server again instead.
        retry: finish
          ? undefined
          : { mode: again ? "again" : "resend", text: message },
      });
    } finally {
      setBusy(false);
    }
  }

  function reset() {
    setMessages([]);
    setOptions([]);
    setCaseId(null);
    setOutcome(null);
    setShowEmergency(false);
    setLocationSent(false);
    setReady({ ready: false, missing: [] });
  }

  const started = messages.length > 0;
  const lastId = messages.at(-1)?.id;
  const lastRetry = messages.at(-1)?.retry;

  function retryLast(r: NonNullable<ChatMessage["retry"]>) {
    if (r.mode === "again" && caseId)
      return void send(r.text, false, false, true);
    // Never reached the server: drop the failed pair and send the text again.
    setMessages((ms) => ms.slice(0, -2));
    void send(r.text);
  }

  return (
    <>
      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div
          className={cn(
            "mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 pt-4 pb-6",
            !started && "min-h-full justify-center",
          )}
        >
          {!started ? (
            <div className="flex animate-in flex-col gap-4 duration-300 ease-out fade-in slide-in-from-bottom-2">
              <h1 className="text-3xl leading-tight font-bold sm:text-4xl">
                {hr.chat.greeting}
              </h1>
              <p className="text-lg text-muted-foreground">
                {patientName} · {hr.chat.hint}
              </p>
              {!locationSkipped && (
                <LocationBar
                  value={location}
                  onChange={setLocation}
                  onSkip={() => setLocationSkipped(true)}
                />
              )}
              <QuickReplies
                options={hr.chat.suggestions}
                onPick={(o) =>
                  o === hr.chat.suggestions[3]
                    ? document.getElementById("composer")?.focus()
                    : void send(o, false, true)
                }
              />
            </div>
          ) : (
            <>
              {!locationSent && !locationSkipped && !outcome && (
                <LocationBar
                  value={location}
                  onChange={setLocation}
                  onSkip={() => setLocationSkipped(true)}
                />
              )}
              <ol
                className="flex flex-col gap-3"
                role="log"
                aria-live="polite"
                aria-relevant="additions text"
              >
                {messages.map((m) => (
                  <MessageBubble
                    key={m.id}
                    message={m}
                    typing={busy && m.id === lastId}
                  />
                ))}
              </ol>
              {!busy && !outcome && lastRetry && (
                <button
                  type="button"
                  onClick={() => retryLast(lastRetry)}
                  className={`${ui.btnSecondary} self-start`}
                >
                  <RefreshCw aria-hidden className="size-5" />
                  {hr.chat.retry}
                </button>
              )}
              {options.length > 0 && !busy && !outcome && (
                <QuickReplies
                  options={options}
                  onPick={(o) => void send(o, false, true)}
                  variant="chips"
                  scope={messages.length}
                />
              )}
              {outcome && (
                <OutcomeCard
                  outcome={outcome}
                  onEmergency={() => setShowEmergency(true)}
                />
              )}
              {outcome && (
                <button
                  type="button"
                  onClick={reset}
                  className={ui.btnSecondary}
                >
                  <RotateCcw aria-hidden className="size-5" />
                  {hr.chat.newChat}
                </button>
              )}
            </>
          )}
          <div ref={endRef} />
        </div>
      </main>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-3 pt-2 pb-3">
        {started && !outcome && caseId && (
          <FinishBar
            ready={ready.ready}
            missing={ready.missing}
            busy={busy}
            onFinish={() => void send("", true)}
          />
        )}
        {!outcome && (
          <Composer
            value={draft}
            onChange={setDraft}
            onSend={(t) => void send(t)}
            autoVoice={autoVoice}
            disabled={busy}
          />
        )}
        <p className="px-2 text-center text-sm text-muted-foreground">
          {hr.disclaimer}
        </p>
      </div>
      {showEmergency && outcome?.kind === "emergency" && (
        <EmergencyTakeover
          places={outcome.places}
          onClose={() => setShowEmergency(false)}
        />
      )}
    </>
  );
}
