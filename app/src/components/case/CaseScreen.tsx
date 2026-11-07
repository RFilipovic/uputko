"use client";

import { ExternalLink, Hourglass, Radio } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useRef } from "react";
import { AppointmentCard } from "@/components/appointment/AppointmentCard";
import { CaseProgress } from "@/components/case/CaseProgress";
import { CaseTimeline } from "@/components/case/CaseTimeline";
import { ReferralArrived } from "@/components/case/ReferralArrived";
import { ReferralCard } from "@/components/case/ReferralCard";
import { StatusPill } from "@/components/case/StatusPill";
import { EmergencyTakeover } from "@/components/emergency/EmergencyTakeover";
import { InstitutionMap } from "@/components/map/InstitutionMap";
import { PlaceCard } from "@/components/map/PlaceCard";
import { OfferCard } from "@/components/notifications/OfferCard";
import { useLiveCase } from "@/hooks/useLiveCase";
import type { CaseView } from "@/lib/caseData";
import { hr } from "@/i18n/hr";
import { referralNumber } from "@/lib/format";
import { ui } from "@/lib/ui";

export function CaseScreen({
  initial,
  patientId,
}: {
  initial: CaseView;
  patientId: string;
}) {
  const { view, refresh, live, error } = useLiveCase(initial, patientId);
  // The uputnica "arrives" only if it was not there when the page opened.
  const firstReferral = useRef(initial.referral?.id ?? null);
  const arrived =
    view.referral != null && view.referral.id !== firstReferral.current;
  const sent = view.events.find((e) => e.kind === "sent_to_doctor");
  const demoUrl =
    typeof sent?.payload.demo_doctor_url === "string"
      ? sent.payload.demo_doctor_url
      : null;
  const doctorName =
    typeof sent?.payload.doctor_name === "string"
      ? sent.payload.doctor_name
      : null;
  const offers = view.offers.filter(
    (o) => o.kind === "earlier_slot_offer" || o.kind === "reschedule_offer",
  );
  const waiting =
    view.status === "sent_to_doctor" || view.status === "viewed_by_doctor";
  const invited = view.events.some((e) => e.kind === "invited_to_exam");

  if (view.status === "emergency_escalated") {
    return <EmergencyTakeover places={view.places} />;
  }

  return (
    <main className="flex-1 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-5 pt-2 pb-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold">{hr.case.title}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={view.status} />
            {live && (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <Radio aria-hidden className="size-4" />
                {hr.case.live}
              </span>
            )}
          </div>
          {view.summary && (
            <p className="text-lg text-foreground/85">
              {view.summary.chief_complaint}
            </p>
          )}
          {error && (
            <p role="alert" className="text-base text-urgent">
              {hr.case.error}
            </p>
          )}
        </div>

        <CaseProgress status={view.status} />

        {arrived && (
          <ReferralArrived doctorName={view.referral?.doctorName ?? null} />
        )}

        {waiting && (
          <section
            className={`${ui.card} flex flex-col gap-3`}
            aria-live="polite"
          >
            <p className="flex items-center gap-2 text-xl font-bold">
              <Hourglass aria-hidden className="size-6" />
              {hr.case.statuses[view.status as keyof typeof hr.case.statuses]}
              {doctorName ? ` · dr. ${doctorName}` : ""}
            </p>
            <p className="text-lg">{hr.case.waitingDoctor}</p>
            {demoUrl && (
              <div className="rounded-2xl border border-dashed border-border p-3">
                <a
                  href={demoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={ui.btnLink}
                >
                  <ExternalLink aria-hidden className="size-4" />
                  {hr.case.demoDoctor}
                </a>
                <p className="text-sm text-muted-foreground">
                  {hr.case.demoDoctorHint}
                </p>
              </div>
            )}
          </section>
        )}

        {invited && (
          <section className={`${ui.card} flex flex-col gap-2`}>
            <h2 className="text-xl font-bold">{hr.case.invitedTitle}</h2>
            <p className="text-lg">{hr.case.invitedBody}</p>
          </section>
        )}

        {view.status === "routed_direct" && view.places.length > 0 && (
          <section
            className="flex flex-col gap-3"
            aria-labelledby="direct-title"
          >
            <h2 id="direct-title" className="text-2xl font-bold">
              {view.anyOpen ? hr.direct.title : hr.direct.titleClosed}
            </h2>
            <p className="text-lg">{hr.direct.noReferral}</p>
            <PlaceCard place={view.places[0]} highlight />
            <InstitutionMap
              points={view.places.map((p) => ({
                lat: p.lat,
                lng: p.lng,
                label: p.name,
                kind: "place",
              }))}
            />
            {view.places.slice(1).map((p) => (
              <PlaceCard key={p.id} place={p} />
            ))}
          </section>
        )}

        {view.appointment && (
          <AppointmentCard
            appointment={view.appointment}
            onChanged={refresh}
            referralNo={view.referral ? referralNumber(view.referral.id) : null}
            fresh={arrived}
          />
        )}
        {view.referral && !view.appointment && (
          <p className={`${ui.card} text-lg`}>{hr.appointment.noSlot}</p>
        )}
        {view.referral && <ReferralCard referral={view.referral} />}

        <CaseTimeline events={view.events} />
        {/* Room to scroll the page above an open offer notification. */}
        {offers.length > 0 && <div aria-hidden className="h-72 shrink-0" />}
      </div>

      {/* Offers arrive like a phone notification at the bottom of the screen. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-3 p-3 sm:p-5">
        <AnimatePresence>
          {offers.map((o) => (
            <OfferCard key={o.id} offer={o} onChanged={refresh} />
          ))}
        </AnimatePresence>
      </div>
    </main>
  );
}
