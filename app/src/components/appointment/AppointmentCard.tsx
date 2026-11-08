"use client";

import { CalendarPlus, CalendarClock, MapPin, Navigation } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import {
  AvailabilityPicker,
  type Availability,
} from "@/components/appointment/AvailabilityPicker";
import { SourceChip } from "@/components/data/SourceChip";
import { InstitutionMap } from "@/components/map/InstitutionMap";
import { OpenBadge } from "@/components/map/OpenBadge";
import type { CaseView } from "@/lib/caseData";
import { directionsUrl, whenParts } from "@/lib/format";
import { hr } from "@/i18n/hr";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Appt = NonNullable<CaseView["appointment"]>;

/** The appointment: big date/time, place, directions, calendar, and the patient's choices. */
export function AppointmentCard({
  appointment,
  onChanged,
  referralNo,
  fresh = false,
  elsewhere = false,
}: {
  appointment: Appt;
  onChanged: () => void;
  /** Uputnica number to bring along. */
  referralNo?: string | null;
  /** Arrived live just now: the map flies in from all of Croatia. */
  fresh?: boolean;
  /** Booked at another hospital than the one on the uputnica (no slot there). */
  elsewhere?: boolean;
}) {
  const [mode, setMode] = useState<"idle" | "picking" | "cancelling">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inst = appointment.institution;
  const status = appointment.status;
  const when = whenParts(appointment.startsAt);

  async function act(
    action: "confirm" | "cancel" | "reschedule",
    body?: Availability,
  ) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/appointments/${appointment.id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const j = (await res?.json().catch(() => null)) as {
        message?: string;
      } | null;
      setError(j?.message ?? hr.appointment.error);
      return;
    }
    setMode("idle");
    onChanged();
  }

  if (status === "cancelled") {
    return <p className={`${ui.card} text-lg`}>{hr.appointment.cancelled}</p>;
  }

  const title =
    status === "confirmed"
      ? hr.appointment.confirmedTitle
      : status === "reschedule_requested"
        ? hr.appointment.rescheduleTitle
        : hr.appointment.proposedTitle;

  return (
    <section
      aria-labelledby="appt-title"
      className={cn(
        ui.card,
        "flex flex-col gap-4",
        // Slide in only when it arrives live; on page load show it at once.
        fresh && "animate-in duration-300 fade-in slide-in-from-bottom-2",
        status === "proposed" && "border-2 border-primary",
      )}
    >
      <h2
        id="appt-title"
        className="flex items-center gap-2 text-xl font-bold text-muted-foreground"
      >
        <CalendarClock aria-hidden className="size-6" />
        {title}
      </h2>
      {/* A new time (earlier slot, reschedule) slides the old one out. */}
      <div className="relative overflow-hidden" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.p
            key={appointment.startsAt}
            className="flex flex-wrap items-baseline gap-x-3 leading-tight"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            <span className="w-full text-xl font-semibold text-foreground/85 first-letter:uppercase">
              {when.weekday}
            </span>
            <span className="text-4xl font-bold">{when.date}</span>
            <span className="text-4xl font-bold text-primary">
              {hr.appointment.at} {when.time}
            </span>
          </motion.p>
        </AnimatePresence>
      </div>
      {inst && (
        <div className="flex flex-col gap-2">
          <p className="text-xl font-semibold">{inst.name}</p>
          <p className="flex items-start gap-2 text-lg text-foreground/85">
            <MapPin aria-hidden className="mt-1 size-5 shrink-0" />
            {[inst.address, inst.city].filter(Boolean).join(", ")}
          </p>
          <OpenBadge info={inst.open} />
        </div>
      )}
      {elsewhere && (
        <p className="rounded-2xl bg-muted p-3 text-base">
          {hr.appointment.elsewhere}
        </p>
      )}
      {status === "reschedule_requested" && (
        <p className="text-lg">{hr.appointment.rescheduleBody}</p>
      )}
      {status === "proposed" && (
        <p className="text-base text-muted-foreground">
          {hr.appointment.holdNote}
        </p>
      )}

      {mode === "picking" ? (
        <AvailabilityPicker
          busy={busy}
          onCancel={() => setMode("idle")}
          onSubmit={(a) => act("reschedule", a)}
        />
      ) : mode === "cancelling" ? (
        <div
          className="flex flex-col gap-2"
          role="group"
          aria-label={hr.appointment.cancelConfirm}
        >
          <p className="text-lg font-semibold">
            {hr.appointment.cancelConfirm}
          </p>
          <button
            type="button"
            className={ui.btnPrimary}
            onClick={() => act("cancel")}
            disabled={busy}
          >
            {hr.appointment.yesCancel}
          </button>
          <button
            type="button"
            className={ui.btnSecondary}
            onClick={() => setMode("idle")}
            disabled={busy}
          >
            {hr.appointment.keep}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {status === "proposed" && (
            <button
              type="button"
              className={ui.btnPrimary}
              onClick={() => act("confirm")}
              disabled={busy}
              aria-busy={busy}
            >
              {hr.appointment.confirm}
            </button>
          )}
          {(status === "proposed" ||
            status === "confirmed" ||
            status === "reschedule_requested") && (
            <button
              type="button"
              className={ui.btnSecondary}
              onClick={() => setMode("picking")}
              disabled={busy}
            >
              {hr.appointment.notSuitable}
            </button>
          )}
          {status === "confirmed" && (
            <a
              className={ui.btnSecondary}
              href={`/api/appointments/${appointment.id}/ics`}
            >
              <CalendarPlus aria-hidden className="size-5" />
              {hr.appointment.addToCalendar}
            </a>
          )}
          {inst?.lat != null && inst.lng != null && (
            <a
              className={ui.btnSecondary}
              href={directionsUrl(inst.lat, inst.lng)}
              target="_blank"
              rel="noreferrer"
            >
              <Navigation aria-hidden className="size-5" />
              {hr.appointment.directions}
            </a>
          )}
          {status !== "reschedule_requested" && (
            <button
              type="button"
              className={`${ui.btnLink} self-start`}
              onClick={() => setMode("cancelling")}
              disabled={busy}
            >
              {hr.appointment.cancel}
            </button>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-base font-medium text-urgent">
          {error}
        </p>
      )}
      {status === "confirmed" && (
        <div>
          <h3 className="text-lg font-bold">{hr.appointment.whatToBring}</h3>
          <ul className="mt-1 list-disc pl-6 text-lg">
            <li>
              {referralNo
                ? hr.appointment.bringReferral(referralNo)
                : hr.appointment.bring[0]}
            </li>
            {hr.appointment.bring.slice(1).map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      {inst?.lat != null && inst.lng != null && (
        <InstitutionMap
          flyFromCountry={fresh}
          points={[
            { lat: inst.lat, lng: inst.lng, label: inst.name, kind: "place" },
          ]}
        />
      )}
      <div className="flex flex-wrap gap-2">
        <SourceChip dataset={inst?.source_dataset} />
        <span className="inline-flex min-h-8 items-center rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
          {hr.appointment.synthetic}
        </span>
      </div>
    </section>
  );
}
