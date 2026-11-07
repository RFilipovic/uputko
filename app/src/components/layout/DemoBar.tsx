"use client";

import { RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { hr } from "@/i18n/hr";
import { ui } from "@/lib/ui";

/** Shown only in demo-safe mode: a label and "Počni ispočetka" for a clean take. */
export function DemoBar() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">(
    "idle",
  );
  async function reset() {
    setState("busy");
    const res = await fetch("/api/demo/reset", { method: "POST" }).catch(
      () => null,
    );
    setState(res?.ok ? "done" : "error");
    router.refresh();
  }
  return (
    <section
      aria-labelledby="demo-title"
      className="flex flex-col gap-2 rounded-3xl border-2 border-dashed border-primary/50 p-4"
    >
      <h2 id="demo-title" className="text-lg font-bold">
        {hr.demo.title}
      </h2>
      <p className="text-base text-muted-foreground">{hr.demo.body}</p>
      <button
        type="button"
        onClick={() => void reset()}
        disabled={state === "busy"}
        aria-busy={state === "busy"}
        className={ui.btnSecondary}
      >
        <RotateCcw aria-hidden className="size-5" />
        {state === "busy" ? hr.demo.resetting : hr.demo.reset}
      </button>
      <p role="status" className="text-base">
        {state === "done" && hr.demo.done}
        {state === "error" && (
          <span className="font-medium text-urgent">{hr.demo.error}</span>
        )}
      </p>
    </section>
  );
}
