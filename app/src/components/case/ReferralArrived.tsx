"use client";

import { FileCheck2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { hr } from "@/i18n/hr";

/**
 * The moment the doctor's uputnica lands: a calm success card with one soft
 * pulse (no confetti). Scrolls itself into view and is announced once.
 */
export function ReferralArrived({ doctorName }: { doctorName: string | null }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    ref.current?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, []);
  return (
    <motion.section
      ref={ref}
      role="status"
      className="relative flex scroll-mt-4 items-start gap-4 rounded-3xl border-2 border-success bg-success/10 p-5"
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
    >
      <span className="relative grid size-14 shrink-0 place-items-center">
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-success/40"
          initial={{ scale: 1, opacity: 0.8 }}
          animate={{ scale: 1.9, opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
        />
        <span className="relative grid size-14 place-items-center rounded-full bg-success text-success-foreground">
          <FileCheck2 aria-hidden className="size-7" />
        </span>
      </span>
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl leading-tight font-bold">
          {hr.referral.arrivedTitle}
        </h2>
        <p className="text-lg">
          {doctorName
            ? hr.referral.arrivedBody(doctorName)
            : hr.referral.arrivedBodyNoDoctor}
        </p>
      </div>
    </motion.section>
  );
}
