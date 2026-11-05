import { addCaseEvent } from "@/lib/cases";
import { db } from "@/lib/db/server";
import type { Json } from "@/lib/db/types";
import { createDoctorToken } from "@/lib/doctorTokens";
import { DoctorCaseEmail } from "@/lib/email/DoctorCaseEmail";
import { sendDemoEmail } from "@/lib/email/send";
import { formatKm } from "@/lib/geo/distance";
import { nearestPreferOpen, type Place } from "@/lib/geo/places";
import { cityPoint, saveCaseLocation, type ResolvedLocation } from "@/lib/location";
import type { PatientProfile } from "@/lib/patients";
import { ROLE_LABEL } from "@/lib/patients";
import { escalatesFromUrgency, type RedFlagId } from "./redFlags";
import { decideRoute, type Role } from "./routing";
import type { CaseSummary } from "./schemas";

/** What happened after intake — sent to the browser and summarised to the model. */
export type Outcome =
  | { kind: "emergency"; caseId: string; rules: RedFlagId[]; places: Place[] }
  | {
      kind: "direct";
      caseId: string;
      places: Place[];
      anyOpen: boolean;
      city: string | null;
      farNote: string | null;
    }
  | {
      kind: "sent_to_doctor";
      caseId: string;
      doctorName: string;
      role: Role;
      emailSent: boolean;
      demoDoctorUrl: string;
    };

const OHBP = "hitna-medicina-ohbp";

function homeLocation(p: PatientProfile): ResolvedLocation | null {
  return p.home_lat != null && p.home_lng != null
    ? { lat: p.home_lat, lng: p.home_lng, city: p.home_city, source: "home" }
    : null;
}

/** Where is the patient now? GPS/typed city on the case → city named in chat → home. */
export async function resolveLocation(
  caseId: string,
  patient: PatientProfile,
  mentionedCity: string | null,
): Promise<ResolvedLocation | null> {
  const { data: c } = await db()
    .from("cases")
    .select("patient_lat, patient_lng, patient_city, location_source")
    .eq("id", caseId)
    .single();
  if (c?.patient_lat != null && c.patient_lng != null && c.location_source !== "home") {
    return {
      lat: c.patient_lat,
      lng: c.patient_lng,
      city: c.patient_city,
      source: (c.location_source as ResolvedLocation["source"]) ?? "gps",
    };
  }
  if (mentionedCity) {
    const pt = await cityPoint(mentionedCity);
    if (pt) {
      const loc: ResolvedLocation = { lat: pt.lat, lng: pt.lng, city: pt.city, source: "chat" };
      await saveCaseLocation(caseId, loc);
      return loc;
    }
  }
  return homeLocation(patient);
}

/** Stop everything: 112 + nearest emergency departments that are open. */
export async function escalateEmergency(
  caseId: string,
  patient: PatientProfile,
  rules: RedFlagId[],
): Promise<Outcome> {
  const loc = (await resolveLocation(caseId, patient, null)) ?? homeLocation(patient);
  if (loc?.source === "home") await saveCaseLocation(caseId, loc);
  const places = loc ? (await nearestPreferOpen({ specialty: OHBP, lat: loc.lat, lng: loc.lng, limit: 3 })).places : [];
  await db().from("cases").update({ route: "emergency", urgency: "hitno" }).eq("id", caseId);
  await addCaseEvent(caseId, "emergency_escalated", { rules }, "emergency_escalated");
  return { kind: "emergency", caseId, rules, places };
}

/** Called when the model submits the summary. Deterministic from here on. */
export async function submitCase(opts: {
  caseId: string;
  patient: PatientProfile;
  summary: CaseSummary;
  origin: string;
}): Promise<Outcome> {
  const { caseId, patient, summary, origin } = opts;

  await db()
    .from("cases")
    .update({ summary_json: summary as unknown as Json, urgency: summary.urgency })
    .eq("id", caseId);

  // Second safety layer: the model judged it urgent.
  if (escalatesFromUrgency(summary.urgency)) {
    return escalateEmergency(caseId, patient, []);
  }

  const current = await resolveLocation(caseId, patient, summary.current_location);
  const home = homeLocation(patient);
  const decision = decideRoute({
    category: summary.category,
    current: current ? { lat: current.lat, lng: current.lng } : null,
    home: home ? { lat: home.lat, lng: home.lng } : null,
    chosenRoles: new Set(patient.doctors.map((d) => d.role)),
  });
  await db()
    .from("cases")
    .update({ route: decision.route, target_role: decision.role })
    .eq("id", caseId);
  await addCaseEvent(caseId, "triaged", { category: summary.category, route: decision.route }, "triaged");

  if (decision.route === "direct" && current) {
    const { places, anyOpen } = await nearestPreferOpen({
      specialty: decision.specialty,
      lat: current.lat,
      lng: current.lng,
      limit: 3,
    });
    const nearest = places[0];
    const farNote =
      nearest && nearest.distance_km > 5
        ? `Najbliža je u mjestu ${nearest.city ?? ""}, ${formatKm(nearest.distance_km)} od vas.`
        : null;
    await addCaseEvent(
      caseId,
      "routed_direct",
      { places: places.map((p) => p.id), any_open: anyOpen, city: current.city },
      "routed_direct",
    );
    return { kind: "direct", caseId, places, anyOpen, city: current.city, farNote };
  }

  const doctor = patient.doctors.find((d) => d.role === decision.role) ?? patient.doctors[0];
  const token = await createDoctorToken(caseId, doctor?.practitioner_id ?? null);
  const caseUrl = `${origin}/lijecnik/slucaj/${token}`;
  const age = new Date().getFullYear() - patient.birth_year;
  const email = await sendDemoEmail({
    subject: `Novi slučaj: ${patient.name} — ${summary.chief_complaint}`.slice(0, 120),
    react: DoctorCaseEmail({
      doctorName: doctor?.full_name ?? "liječnik",
      patientName: patient.name,
      patientAge: age,
      summary,
      currentCity: current?.city ?? summary.current_location ?? patient.home_city,
      caseUrl,
    }),
  });
  if (!email.sent) console.error("doctor email not sent:", email.reason);

  await addCaseEvent(
    caseId,
    "sent_to_doctor",
    {
      doctor_name: doctor?.full_name ?? null,
      role: decision.role,
      role_label: ROLE_LABEL[decision.role],
      email_sent: email.sent,
      // Demo only: lets the jury open the doctor portal without the inbox.
      demo_doctor_url: caseUrl,
    },
    "sent_to_doctor",
  );
  return {
    kind: "sent_to_doctor",
    caseId,
    doctorName: doctor?.full_name ?? "",
    role: decision.role,
    emailSent: email.sent,
    demoDoctorUrl: caseUrl,
  };
}

/** Short factual text the model turns into its closing message. */
export function outcomeForModel(o: Outcome): string {
  switch (o.kind) {
    case "emergency":
      return JSON.stringify({
        ishod: "hitno",
        uputa: "Reci pacijentu neka odmah nazove 112. Ne postavljaj pitanja.",
        najblize_hitne: o.places.slice(0, 2).map((p) => `${p.name}, ${p.address ?? ""}, ${p.city ?? ""}`),
      });
    case "direct":
      return JSON.stringify({
        ishod: "izravno, bez uputnice",
        uputa: o.anyOpen
          ? "Pacijent može odmah otići na najbližu otvorenu ordinaciju. Kartica s adresom i radnim vremenom prikazana je ispod poruke."
          : "Trenutno nijedna obližnja ordinacija nije otvorena. Kartica s adresama i radnim vremenom prikazana je ispod poruke.",
        najbliza: o.places[0]
          ? {
              naziv: o.places[0].name,
              adresa: `${o.places[0].address ?? ""}, ${o.places[0].city ?? ""}`,
              udaljenost: formatKm(o.places[0].distance_km),
              otvoreno_do: o.places[0].closes_at?.slice(0, 5) ?? null,
            }
          : null,
        napomena: o.farNote,
      });
    case "sent_to_doctor":
      return JSON.stringify({
        ishod: "poslano liječniku",
        lijecnik: `dr. ${o.doctorName} (${ROLE_LABEL[o.role]})`,
        uputa:
          "Sažetak je poslan liječniku. Pacijent će dobiti obavijest čim liječnik odluči (npr. izda uputnicu i termin). Ne treba nikamo zvati.",
      });
  }
}
