"use client";

import { useState } from "react";
import { Composer } from "@/components/chat/Composer";
import { QuickReplies } from "@/components/chat/QuickReplies";
import { hr } from "@/i18n/hr";

/**
 * Chat screen. Phase 1: empty state + composer. The agent conversation is
 * wired up in Phase 2 (/api/chat streaming).
 */
export function ChatScreen({ autoVoice = false }: { autoVoice?: boolean }) {
  const [draft, setDraft] = useState("");

  return (
    <>
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pt-4 pb-6">
        <div className="flex animate-in flex-col gap-3 duration-300 ease-out fade-in slide-in-from-bottom-2">
          <h1 className="text-3xl leading-tight font-bold">
            {hr.chat.greeting}
          </h1>
          <p className="text-lg text-muted-foreground">{hr.chat.hint}</p>
        </div>
        <QuickReplies options={hr.chat.suggestions} onPick={setDraft} />
      </main>
      <Composer
        value={draft}
        onChange={setDraft}
        onSend={() => setDraft("")}
        autoVoice={autoVoice}
      />
    </>
  );
}
