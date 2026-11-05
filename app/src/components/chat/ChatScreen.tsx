"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Composer } from "@/components/chat/Composer";
import { LocationBar, type ChatLocation } from "@/components/chat/LocationBar";
import {
  MessageBubble,
  type ChatMessage,
} from "@/components/chat/MessageBubble";
import { OutcomeCard } from "@/components/chat/OutcomeCard";
import { QuickReplies } from "@/components/chat/QuickReplies";
import { FinishBar } from "@/components/chat/FinishBar";
import { EmergencyTakeover } from "@/components/emergency/EmergencyTakeover";
import { hr } from "@/i18n/hr";
import { visibleText } from "@/lib/agent/options";
import type { Outcome } from "@/lib/agent/outcome";
import { ui } from "@/lib/ui";

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
  const [ready, setReady] = useState<{ ready: boolean; missing: string[] }>({
    ready: false,
    missing: [],
  });
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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

  async function send(text: string, finish = false) {
    const message = finish ? hr.chat.finishMessage : text.trim();
    if (!message || busy || outcome) return;
    const replyId = nextId();
    setMessages((ms) => [
      ...ms,
      { id: nextId(), role: "user", text: message },
      { id: replyId, role: "assistant", text: "" },
    ]);
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
          message: finish ? undefined : message,
          finish,
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
            });
          }
        }
      }
      const finalOutcome = gotOutcome as Outcome | null;
      if (!raw.trim() && finalOutcome?.kind === "emergency") {
        patchAssistant(replyId, { text: hr.emergency.chatText, error: true });
      }
    } catch {
      patchAssistant(replyId, { text: hr.chat.errors.offline, error: true });
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

  return (
    <>
      <main className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pt-4 pb-6">
        {!started ? (
          <div className="flex animate-in flex-col gap-4 duration-300 ease-out fade-in slide-in-from-bottom-2">
            <h1 className="text-3xl leading-tight font-bold">
              {hr.chat.greeting}
            </h1>
            <p className="text-lg text-muted-foreground">
              {patientName} · {hr.chat.hint}
            </p>
            <LocationBar value={location} onChange={setLocation} />
            <QuickReplies
              options={hr.chat.suggestions}
              onPick={(o) =>
                o === hr.chat.suggestions[3]
                  ? document.getElementById("composer")?.focus()
                  : void send(o)
              }
            />
          </div>
        ) : (
          <>
            {!locationSent && !outcome && (
              <LocationBar value={location} onChange={setLocation} />
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
            {options.length > 0 && !busy && !outcome && (
              <QuickReplies
                options={options}
                onPick={(o) => void send(o)}
                variant="chips"
              />
            )}
            {outcome && (
              <OutcomeCard
                outcome={outcome}
                onEmergency={() => setShowEmergency(true)}
              />
            )}
            {outcome && (
              <button type="button" onClick={reset} className={ui.btnSecondary}>
                <RotateCcw aria-hidden className="size-5" />
                {hr.chat.newChat}
              </button>
            )}
          </>
        )}
        <div ref={endRef} />
      </main>
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
      {showEmergency && outcome?.kind === "emergency" && (
        <EmergencyTakeover
          places={outcome.places}
          onClose={() => setShowEmergency(false)}
        />
      )}
    </>
  );
}
