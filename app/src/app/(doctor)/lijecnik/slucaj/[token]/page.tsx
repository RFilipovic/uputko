import { Compass, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { SourceChip } from "@/components/data/SourceChip";
import { DoctorDecision } from "@/components/doctor/DoctorDecision";
import { InstitutionMap } from "@/components/map/InstitutionMap";
import type { CaseSummary } from "@/lib/agent/schemas";
import { addCaseEvent } from "@/lib/cases";
import { db } from "@/lib/db/server";
import { BOOKABLE_SPECIALTIES, DECIDED, doctorCase } from "@/lib/doctorCase";
import { formatKm } from "@/lib/geo/distance";
import { nearestPlaces } from "@/lib/geo/places";
import { getPatientProfile } from "@/lib/patients";
import { bestMatch } from "@/lib/similarity";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";
import { hr } from "@/i18n/hr";

export const metadata: Metadata = {
  title: `${hr.doctor.portal} · ${hr.app.name}`,
  robots: { index: false },
};
export const dynamic = "force-dynamic";

/** Urgency at a glance. Red stays reserved for "hitno". */
const URGENCY_TONE: Record<string, string> = {
  hitno: "bg-urgent text-urgent-foreground",
  uskoro: "bg-primary text-primary-foreground",
  rutinski: "bg-muted text-foreground",
};

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <p className="flex items-center gap-3 text-xl font-bold">
            <span className="grid size-10 place-items-center rounded-xl text-white bg-brand-gradient">
              <Compass aria-hidden className="size-5" />
            </span>
            {hr.app.name} · {hr.doctor.portal}
          </p>
          <p className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">
            {hr.doctor.demoNote}
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

export default async function DoctorCasePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const dc = await doctorCase(token);
  if (!dc.ok) {
    return (
      <Shell>
        <p className={`${ui.card} text-xl`}>
          {dc.reason === "expired" ? hr.doctor.expired : hr.doctor.invalid}
        </p>
      </Shell>
    );
  }
  const c = dc.case;
  if (c.status === "sent_to_doctor") {
    await addCaseEvent(c.id, "viewed_by_doctor", {}, "viewed_by_doctor");
  }
  const s = c.summary_json as CaseSummary | null;
  const patient = await getPatientProfile(c.patient_id);
  const { data: transcript } = await db()
    .from("messages")
    .select("id, role, content")
    .eq("case_id", c.id)
    .in("role", ["user", "assistant"])
    .order("created_at")
    .order("id");

  const { data: specialties } = await db()
    .from("specialties")
    .select("code, name")
    .in("code", [...BOOKABLE_SPECIALTIES]);
  const suggested = s?.suggested_specialty
    ? // Strict (0.8): "stomatologija" must not become "Reumatologija".
      bestMatch(s.suggested_specialty, specialties ?? [], (x) => x.name, 0.8)
    : null;
  const nearby =
    suggested && c.patient_lat != null && c.patient_lng != null
      ? await nearestPlaces({
          specialty: suggested.code,
          lat: c.patient_lat,
          lng: c.patient_lng,
          limit: 5,
        })
      : [];
  const age = patient ? new Date().getFullYear() - patient.birth_year : null;

  const rows: Array<[string, string]> = s
    ? [
        ...(s.for_child
          ? ([[hr.doctor.fields.child, s.child_age ?? "—"]] as Array<
              [string, string]
            >)
          : []),
        [hr.doctor.fields.complaint, s.chief_complaint],
        [hr.doctor.fields.location, s.body_location],
        [
          hr.doctor.fields.onset,
          `${s.onset}${s.duration ? ` · ${s.duration}` : ""}`,
        ],
        [
          hr.doctor.fields.fever,
          s.fever === "da"
            ? `da${s.fever_celsius ? `, ${s.fever_celsius} °C` : ""}`
            : s.fever,
        ],
        [hr.doctor.fields.severity, s.severity ? `${s.severity}/10` : "—"],
        [hr.doctor.fields.symptoms, s.associated_symptoms.join(", ") || "—"],
        [hr.doctor.fields.history, s.relevant_history || "—"],
      ]
    : [];

  return (
    <Shell>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-6">
          <section className={`${ui.card} flex flex-col gap-3`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className={ui.label}>{hr.doctor.patient}</p>
                <h1 className="text-3xl font-bold">
                  {patient?.name ?? "—"}
                  {age ? `, ${age} g.` : ""}
                </h1>
              </div>
              {c.urgency && (
                <p
                  className={cn(
                    "rounded-full px-4 py-1.5 text-base font-semibold",
                    URGENCY_TONE[c.urgency] ?? "bg-muted text-foreground",
                  )}
                >
                  <span className="sr-only">{hr.doctor.urgency}: </span>
                  {hr.doctor.urgencies[c.urgency] ?? c.urgency}
                </p>
              )}
            </div>
            <p className="flex items-center gap-2 text-lg">
              <MapPin aria-hidden className="size-5 text-muted-foreground" />
              {hr.doctor.currentlyIn}:{" "}
              <strong>
                {c.patient_city ?? s?.current_location ?? patient?.home_city}
              </strong>
            </p>
          </section>
          {s && (
            <section
              className={`${ui.card} flex flex-col gap-3`}
              aria-labelledby="sum-title"
            >
              <h2 id="sum-title" className="text-2xl font-bold">
                {hr.doctor.summary}
              </h2>
              <p className="text-base text-muted-foreground">
                {hr.doctor.summaryNote}
              </p>
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-3">
                {rows.map(([k, v]) => (
                  <div key={k} className="border-l-2 border-border pl-3">
                    <dt className={ui.label}>{k}</dt>
                    <dd className="text-base font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="rounded-2xl bg-muted p-4">
                <p className={ui.label}>{hr.doctor.suggestion}</p>
                <p className="text-lg font-semibold">{s.suggested_specialty}</p>
              </div>
            </section>
          )}
          <details className={ui.card}>
            <summary className="cursor-pointer text-xl font-bold">
              {hr.doctor.transcript}
            </summary>
            <ol className="mt-4 flex flex-col gap-3">
              {(transcript ?? []).map((m) => (
                <li key={m.id} className="text-base">
                  <strong>
                    {m.role === "user" ? hr.doctor.patient : hr.chat.assistant}:
                  </strong>{" "}
                  {m.content.replace(/\n?\s*OPCIJE:[^\n]*$/, "")}
                </li>
              ))}
            </ol>
          </details>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-6 lg:self-start">
          {DECIDED.has(c.status) ? (
            <p className={`${ui.card} text-xl`}>{hr.doctor.alreadyDone}</p>
          ) : (
            <DoctorDecision token={token} />
          )}
          {nearby.length > 0 && (
            <section
              className={`${ui.card} flex flex-col gap-3`}
              aria-labelledby="near-title"
            >
              <h2 id="near-title" className="text-xl font-bold">
                {hr.doctor.nearby} — {suggested?.name}
              </h2>
              <InstitutionMap
                className="h-64"
                points={[
                  ...(c.patient_lat != null && c.patient_lng != null
                    ? [
                        {
                          lat: c.patient_lat,
                          lng: c.patient_lng,
                          label: hr.doctor.patient,
                          kind: "you" as const,
                        },
                      ]
                    : []),
                  ...nearby.map((p) => ({
                    lat: p.lat,
                    lng: p.lng,
                    label: p.name,
                    kind: "place" as const,
                  })),
                ]}
              />
              <ol className="flex flex-col gap-2">
                {nearby.map((p) => (
                  <li
                    key={p.id}
                    className="flex justify-between gap-3 text-base"
                  >
                    <span className="font-semibold">{p.name}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatKm(p.distance_km)}
                    </span>
                  </li>
                ))}
              </ol>
              <SourceChip dataset={nearby[0].source_dataset} />
            </section>
          )}
        </div>
      </div>
    </Shell>
  );
}
