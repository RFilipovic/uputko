import { CheckCircle2, ExternalLink, Phone } from "lucide-react";
import Link from "next/link";
import type { Outcome } from "@/lib/agent/outcome";
import { InstitutionMap } from "@/components/map/InstitutionMap";
import { PlaceCard } from "@/components/map/PlaceCard";
import { hr } from "@/i18n/hr";
import { ui } from "@/lib/ui";

/** What happened after the intake, shown under the last chat message. */
export function OutcomeCard({
  outcome,
  onEmergency,
}: {
  outcome: Outcome;
  onEmergency: () => void;
}) {
  if (outcome.kind === "emergency") {
    return (
      <div className="flex flex-col gap-3 rounded-3xl border-2 border-urgent bg-urgent/5 p-5">
        <p className="text-xl font-bold text-urgent">{hr.emergency.title}</p>
        <a href="tel:112" className={ui.btnUrgent}>
          <Phone aria-hidden className="size-7" />
          {hr.emergency.call}
        </a>
        <button type="button" className={ui.btnLink} onClick={onEmergency}>
          {hr.emergency.nearest}
        </button>
      </div>
    );
  }

  if (outcome.kind === "direct") {
    const [first, ...rest] = outcome.places;
    return (
      <section className="flex flex-col gap-3" aria-labelledby="direct-title">
        <h2 id="direct-title" className="text-2xl font-bold">
          {outcome.anyOpen ? hr.direct.title : hr.direct.titleClosed}
        </h2>
        <p className="text-lg">{hr.direct.noReferral}</p>
        {outcome.farNote && (
          <p className="text-lg font-medium">{outcome.farNote}</p>
        )}
        {!outcome.anyOpen && (
          <p className="text-lg text-muted-foreground">{hr.direct.allClosed}</p>
        )}
        {first && (
          <>
            <PlaceCard place={first} highlight />
            <InstitutionMap
              points={outcome.places.map((p, i) => ({
                lat: p.lat,
                lng: p.lng,
                label: p.name,
                kind: i === 0 ? "place" : "place",
              }))}
            />
          </>
        )}
        {rest.map((p) => (
          <PlaceCard key={p.id} place={p} />
        ))}
        <Link href={`/slucaj/${outcome.caseId}`} className={ui.btnSecondary}>
          {hr.chat.openCase}
        </Link>
      </section>
    );
  }

  return (
    <section
      className={`${ui.card} flex flex-col gap-3`}
      aria-labelledby="sent-title"
    >
      <h2
        id="sent-title"
        className="flex items-center gap-2 text-2xl font-bold"
      >
        <CheckCircle2 aria-hidden className="size-7 text-success" />
        {hr.chat.sentTitle}
      </h2>
      <p className="text-lg leading-relaxed">
        {hr.chat.sentBody(outcome.doctorName)}
      </p>
      <Link href={`/slucaj/${outcome.caseId}`} className={ui.btnPrimary}>
        {hr.chat.openCase}
      </Link>
      <a
        href={outcome.demoDoctorUrl}
        target="_blank"
        rel="noreferrer"
        className={`${ui.btnLink} self-start`}
      >
        <ExternalLink aria-hidden className="size-4" />
        {hr.case.demoDoctor}
      </a>
    </section>
  );
}
