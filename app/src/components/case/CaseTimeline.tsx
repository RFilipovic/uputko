"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { hr } from "@/i18n/hr";
import { formatWhen } from "@/lib/format";
import { ui } from "@/lib/ui";

const RECENT = 4;

/** What has happened so far, oldest first (driven by case_events). */
export function CaseTimeline({
  events,
}: {
  events: Array<{ id: number; kind: string; at: string }>;
}) {
  const [all, setAll] = useState(false);
  const shown = events.filter((e) => hr.case.events[e.kind]);
  if (!shown.length) return null;
  const hidden = all ? 0 : Math.max(shown.length - RECENT, 0);
  const visible = shown.slice(hidden);
  return (
    <section aria-labelledby="timeline-title" className="flex flex-col gap-3">
      <h2 id="timeline-title" className="text-xl font-bold">
        {hr.case.timeline}
      </h2>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setAll(true)}
          className={`${ui.btnLink} self-start`}
        >
          <ChevronDown aria-hidden className="size-4" />
          {hr.case.showAll(shown.length)}
        </button>
      )}
      <ol className="relative flex flex-col gap-4 border-l-2 border-border pl-6">
        <AnimatePresence initial={false}>
          {visible.map((e) => {
            const last = e.id === shown[shown.length - 1].id;
            return (
              <motion.li
                key={e.id}
                layout="position"
                className="relative"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <span
                  aria-hidden
                  className={`absolute top-1.5 -left-[33px] size-4 rounded-full border-2 border-background ${last ? "bg-primary" : "bg-muted-foreground/50"}`}
                />
                <p className="text-lg font-semibold">
                  {hr.case.events[e.kind]}
                </p>
                <p className="text-base text-muted-foreground">
                  {formatWhen(e.at)}
                </p>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
    </section>
  );
}
