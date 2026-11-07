"use client";

import { Check } from "lucide-react";
import { motion } from "motion/react";
import { hr } from "@/i18n/hr";
import { cn } from "@/lib/utils";

/** How far along the doctor path the case is: index of the last done step. */
const DONE: Record<string, number> = {
  sent_to_doctor: 0,
  viewed_by_doctor: 1,
  referral_issued: 2,
  appointment_proposed: 2,
  reschedule_requested: 2,
  appointment_confirmed: 3,
  done: 3,
};

/**
 * Four big steps: Poslano liječniku → Pregledano → Uputnica izdana → Termin
 * potvrđen. The bar fills and the new step pops in when the status changes.
 */
export function CaseProgress({ status }: { status: string }) {
  const done = DONE[status];
  if (done === undefined) return null;
  const steps = hr.case.progress;
  const current = Math.min(done + 1, steps.length - 1);
  const finished = done === steps.length - 1;
  return (
    <section aria-labelledby="progress-title">
      <h2 id="progress-title" className="sr-only">
        {hr.case.progressTitle}
      </h2>
      <ol className="relative grid grid-cols-4 gap-1">
        {/* Track behind the dots, from the first to the last dot centre. */}
        <div
          aria-hidden
          className="absolute top-5 right-[12.5%] left-[12.5%] h-1.5 -translate-y-1/2 rounded-full bg-muted"
        >
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={false}
            animate={{ width: `${(done / (steps.length - 1)) * 100}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>
        {steps.map((label, i) => {
          const isDone = i <= done;
          const isCurrent = !finished && i === current;
          return (
            <li
              key={label}
              className="relative flex flex-col items-center gap-2 text-center"
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className="relative grid size-10 place-items-center">
                {isCurrent && (
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-primary/25"
                    animate={{ scale: [1, 1.5, 1], opacity: [0.7, 0, 0.7] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                  />
                )}
                <motion.span
                  className={cn(
                    "relative grid size-10 place-items-center rounded-full border-4 text-base font-bold",
                    isDone
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCurrent
                        ? "border-primary bg-card text-primary dark:text-foreground"
                        : "border-muted bg-card text-muted-foreground",
                  )}
                  initial={false}
                  animate={isDone ? { scale: [0.6, 1.15, 1] } : { scale: 1 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  key={isDone ? "done" : "todo"}
                >
                  {isDone ? (
                    <Check aria-hidden className="size-5" strokeWidth={3} />
                  ) : (
                    <span aria-hidden>{i + 1}</span>
                  )}
                </motion.span>
              </span>
              <span
                className={cn(
                  "text-sm leading-tight font-semibold sm:text-base",
                  !isDone && !isCurrent && "text-muted-foreground",
                )}
              >
                {label}
                <span className="sr-only">
                  {" "}
                  —{" "}
                  {isDone
                    ? hr.case.stepDone
                    : isCurrent
                      ? hr.case.stepCurrent
                      : hr.case.stepNext}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
