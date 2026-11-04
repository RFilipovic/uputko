"use client";

import { Mic, MicOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { hr } from "@/i18n/hr";
import { cn } from "@/lib/utils";

// Minimal typing for the Web Speech API (not in TS's DOM lib everywhere).
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  onresult:
    | ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void)
    | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function getRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * Croatian voice input. Hidden when the browser has no speech recognition
 * (the text box always works).
 */
export function VoiceButton({
  onTranscript,
  autoStart = false,
}: {
  onTranscript: (text: string) => void;
  autoStart?: boolean;
}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const rec = useRef<Recognition | null>(null);

  useEffect(() => {
    setSupported(getRecognition() !== null);
  }, []);

  function start() {
    const Ctor = getRecognition();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = "hr-HR";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      const text = Array.from(e.results)
        .map((res) => res[0]?.transcript ?? "")
        .join(" ");
      onTranscript(text);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    rec.current = r;
    setListening(true);
    r.start();
  }

  function toggle() {
    if (listening) rec.current?.stop();
    else start();
  }

  useEffect(() => {
    if (autoStart && supported) start();
    // reason: start once when the page opens via "Ili recite naglas"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, supported]);

  if (!supported) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={listening}
      aria-label={hr.chat.voice}
      title={hr.chat.voice}
      className={cn(
        "grid size-14 shrink-0 place-items-center rounded-full text-ink transition-colors duration-200 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        listening ? "animate-pulse bg-pink" : "bg-pink/90 hover:bg-pink",
      )}
    >
      {listening ? (
        <MicOff aria-hidden className="size-6" />
      ) : (
        <Mic aria-hidden className="size-6" />
      )}
    </button>
  );
}
