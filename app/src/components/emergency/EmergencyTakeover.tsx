"use client";

import { Phone } from "lucide-react";
import { useEffect, useRef } from "react";
import { InstitutionMap } from "@/components/map/InstitutionMap";
import { PlaceCard, type PlaceLike } from "@/components/map/PlaceCard";
import { hr } from "@/i18n/hr";
import { ui } from "@/lib/ui";

/** Full-screen, high-contrast emergency screen: one giant 112 button + nearest OHBP. */
export function EmergencyTakeover({
  places,
  onClose,
}: {
  places: PlaceLike[];
  onClose?: () => void;
}) {
  const callRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => callRef.current?.focus(), []);
  const nearest = places[0];
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="emergency-title"
      aria-describedby="emergency-body"
      className="absolute inset-0 z-50 flex animate-in flex-col gap-5 overflow-y-auto bg-background p-5 duration-150 fade-in"
    >
      <div className="rounded-3xl bg-urgent p-6 text-urgent-foreground">
        <h2 id="emergency-title" className="text-3xl leading-tight font-bold">
          {hr.emergency.title}
        </h2>
        <p id="emergency-body" className="mt-3 text-xl leading-relaxed">
          {hr.emergency.body}
        </p>
      </div>
      <a
        ref={callRef}
        href="tel:112"
        className={`${ui.btnUrgent} min-h-20 text-3xl`}
        aria-label={hr.emergency.callLabel}
      >
        <Phone aria-hidden className="size-8" />
        {hr.emergency.call}
      </a>
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
  );
}
