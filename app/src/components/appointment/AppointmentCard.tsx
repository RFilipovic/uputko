"use client";

import { CalendarPlus, CalendarClock, Navigation } from "lucide-react";
import { useState } from "react";
import { AvailabilityPicker, type Availability } from "@/components/appointment/AvailabilityPicker";
import { InstitutionMap } from "@/components/map/InstitutionMap";
import type { CaseView } from "@/lib/caseData";
import { directionsUrl, formatWhen } from "@/lib/format";
import { hr } from "@/i18n/hr";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Appt = NonNullable<CaseView["appointment"]>;

/** The appointment: big date/time, place, directions, calendar, and the patient's choices. */
export function AppointmentCard({ appointment, onChanged }: { appointment: Appt; onChanged: () => void }) {
  const [mode, setMode] = useState<"idle" | "picking" | "cancelling">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inst = appointment.institution;
  const status = appointment.status;

  async function act(action: "confirm" | "cancel" | "reschedule", body?: Availability) {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/appointments/${appointment.id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const j = (await res?.json().catch(() => null)) as { message?: string } | null;
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
      className={cn(ui.card, "animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4 duration-300", status === "proposed" && "border-2 border-primary")}
    >
      <h2 id="appt-title" className="flex items-center gap-2 text-xl font-bold text-muted-foreground">
        <CalendarClock aria-hidden className="size-6" />
        {title}
      </h2>
      <p className="text-3xl leading-tight font-bold">{formatWhen(appointment.startsAt)}</p>
      {inst && (
        <div>
          <p className="text-xl font-semibold">{inst.name}</p>
          <p className="text-lg text-foreground/85">{[inst.address, inst.city].filter(Boolean).join(", ")}</p>
        </div>
      )}
      {status === "reschedule_requested" && <p className="text-lg">{hr.appointment.rescheduleBody}</p>}
      {status === "proposed" && <p className="text-base text-muted-foreground">{hr.appointment.holdNote}</p>}

      {mode === "picking" ? (
        <AvailabilityPicker busy={busy} onCancel={() => setMode("idle")} onSubmit={(a) => act("reschedule", a)} />
      ) : mode === "cancelling" ? (
        <div className="flex flex-col gap-2" role="group" aria-label={hr.appointment.cancelConfirm}>
          <p className="text-lg font-semibold">{hr.appointment.cancelConfirm}</p>
          <button type="button" className={ui.btnPrimary} onClick={() => act("cancel")} disabled={busy}>
            {hr.appointment.yesCancel}
          </button>
          <button type="button" className={ui.btnSecondary} onClick={() => setMode("idle")} disabled={busy}>
            {hr.appointment.keep}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {status === "proposed" && (
            <button type="button" className={ui.btnPrimary} onClick={() => act("confirm")} disabled={busy} aria-busy={busy}>
              {hr.appointment.confirm}
            </button>
          )}
          {(status === "proposed" || status === "confirmed" || status === "reschedule_requested") && (
            <button type="button" className={ui.btnSecondary} onClick={() => setMode("picking")} disabled={busy}>
              {hr.appointment.notSuitable}
            </button>
          )}
          {status === "confirmed" && (
            <a className={ui.btnSecondary} href={`/api/appointments/${appointment.id}/ics`}>
              <CalendarPlus aria-hidden className="size-5" />
              {hr.appointment.addToCalendar}
            </a>
          )}
          {inst?.lat != null && inst.lng != null && (
            <a className={ui.btnSecondary} href={directionsUrl(inst.lat, inst.lng)} target="_blank" rel="noreferrer">
              <Navigation aria-hidden className="size-5" />
              {hr.appointment.directions}
            </a>
          )}
          {status !== "reschedule_requested" && (
            <button type="button" className={`${ui.btnLink} self-start`} onClick={() => setMode("cancelling")} disabled={busy}>
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
            {hr.appointment.bring.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      {inst?.lat != null && inst.lng != null && (
        <InstitutionMap points={[{ lat: inst.lat, lng: inst.lng, label: inst.name, kind: "place" }]} />
      )}
      <p className="text-sm text-muted-foreground">{hr.appointment.synthetic}</p>
    </section>
  );
}
