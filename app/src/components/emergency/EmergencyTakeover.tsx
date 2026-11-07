"use client";

import { Phone, Siren } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { InstitutionMap } from "@/components/map/InstitutionMap";
import { PlaceCard, type PlaceLike } from "@/components/map/PlaceCard";
import { hr } from "@/i18n/hr";
import { ui } from "@/lib/ui";

/**
 * Full-screen, high-contrast emergency screen. One thing to do: call 112.
 * Below it only the nearest emergency department (OHBP), with directions.
 */
export function EmergencyTakeover({
  places,
  onClose,
}: {
  places: PlaceLike[];
  onClose?: () => void;
}) {
  const callRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    callRef.current?.focus();
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const nearest = places[0];
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="emergency-title"
      aria-describedby="emergency-body"
      className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-background"
    >
      <motion.section
        // Same deep red in both themes: white text stays above 4.5:1.
        className="bg-[oklch(0.5_0.2_27)] text-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
      >
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-5 pt-8 pb-8">
          <span className="relative grid size-16 place-items-center">
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full bg-white/30"
              animate={{ scale: [1, 1.45, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
            />
            <span className="relative grid size-16 place-items-center rounded-full bg-white text-[oklch(0.5_0.2_27)]">
              <Siren aria-hidden className="size-8" />
            </span>
          </span>
          <h2 id="emergency-title" className="text-4xl leading-tight font-bold">
            {hr.emergency.title}
          </h2>
          <p id="emergency-body" className="text-xl leading-relaxed">
            {hr.emergency.body}
          </p>
          <a
            ref={callRef}
            href="tel:112"
            aria-label={hr.emergency.callLabel}
            className="inline-flex min-h-20 items-center justify-center gap-4 rounded-2xl bg-white px-6 text-3xl font-bold text-[oklch(0.5_0.2_27)] shadow-lg focus-visible:ring-4 focus-visible:ring-white/70 focus-visible:ring-offset-4 focus-visible:ring-offset-[oklch(0.5_0.2_27)] focus-visible:outline-none"
          >
            <Phone aria-hidden className="size-9" />
            {hr.emergency.call}
          </a>
        </div>
      </motion.section>

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-5 pt-6 pb-8">
        {nearest && (
          <section aria-labelledby="ohbp-title" className="flex flex-col gap-3">
            <h3 id="ohbp-title" className="text-xl font-bold">
              {hr.emergency.nearest}
            </h3>
            <PlaceCard place={nearest} emergency />
            <InstitutionMap
              points={[
                {
                  lat: nearest.lat,
                  lng: nearest.lng,
                  label: nearest.name,
                  kind: "emergency",
                },
              ]}
            />
          </section>
        )}
        {onClose && (
          <button type="button" onClick={onClose} className={ui.btnSecondary}>
            {hr.emergency.back}
          </button>
        )}
      </div>
    </div>
  );
}
