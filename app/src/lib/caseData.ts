import type { CaseSummary } from "@/lib/agent/schemas";
import { db } from "@/lib/db/server";
import { nearestPreferOpen, type Place } from "@/lib/geo/places";
import { SPECIALTY_BY_ROLE, type Role } from "@/lib/agent/routing";

export type InstitutionCard = {
  id: string;
  name: string;
  type: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  web: string | null;
  lat: number | null;
  lng: number | null;
  geo_precision: string | null;
  source_dataset: string;
  hours: Array<{ weekday: number; opens: string; closes: string; is_on_call: boolean; source: string }>;
  open: { has_hours: boolean; open_now: boolean | null; closes_at: string | null; is_on_call: boolean } | null;
};

export type CaseView = {
  id: string;
  status: string;
  route: string | null;
  urgency: string | null;
  targetRole: Role | null;
  city: string | null;
  createdAt: string;
  summary: CaseSummary | null;
  events: Array<{ id: number; kind: string; payload: Record<string, unknown>; at: string }>;
  referral: null | {
    id: string;
    type: string;
    specialtyName: string;
    priority: string;
    note: string | null;
    issuedAt: string;
    hasDocument: boolean;
    doctorName: string | null;
    institution: InstitutionCard | null;
  };
  appointment: null | {
    id: string;
    status: string;
    startsAt: string;
    endsAt: string;
    heldUntil: string | null;
    institution: InstitutionCard | null;
    availability: unknown;
  };
  offers: Array<{ id: string; kind: string; payload: Record<string, unknown>; createdAt: string }>;
  places: Place[];
  anyOpen: boolean;
};

export async function institutionCard(id: string): Promise<InstitutionCard | null> {
  const { data } = await db().rpc("institution_card", { p_institution_id: id });
  return (data as InstitutionCard | null) ?? null;
}

/** Everything the patient's case page shows. Null if the case is not this patient's. */
export async function loadCaseView(caseId: string, patientId: string): Promise<CaseView | null> {
  const { data: c } = await db()
    .from("cases")
    .select("id, patient_id, status, route, urgency, target_role, patient_city, patient_lat, patient_lng, created_at, summary_json")
    .eq("id", caseId)
    .maybeSingle();
  if (!c || c.patient_id !== patientId) return null;

  const [{ data: events }, { data: refs }, { data: offers }] = await Promise.all([
    db().from("case_events").select("id, kind, payload, at").eq("case_id", caseId).order("id"),
    db()
      .from("referrals")
      .select("id, type, specialty_code, priority, note, issued_at, institution_id, practitioner_id, document_mime")
      .eq("case_id", caseId)
      .order("issued_at", { ascending: false })
      .limit(1),
    db()
      .from("notifications")
      .select("id, kind, payload, created_at")
      .eq("case_id", caseId)
      .eq("action_state", "pending")
      .order("created_at", { ascending: false }),
  ]);

  let referral: CaseView["referral"] = null;
  let appointment: CaseView["appointment"] = null;
  const ref = refs?.[0];
  if (ref) {
    const [{ data: spec }, { data: doc }, inst] = await Promise.all([
      db().from("specialties").select("name").eq("code", ref.specialty_code).single(),
      ref.practitioner_id
        ? db().from("practitioners").select("full_name").eq("id", ref.practitioner_id).single()
        : Promise.resolve({ data: null }),
      ref.institution_id ? institutionCard(ref.institution_id) : Promise.resolve(null),
    ]);
    referral = {
      id: ref.id,
      type: ref.type,
      specialtyName: spec?.name ?? ref.specialty_code,
      priority: ref.priority,
      note: ref.note,
      issuedAt: ref.issued_at,
      hasDocument: Boolean(ref.document_mime),
      doctorName: doc?.full_name ?? null,
      institution: inst,
    };
    const { data: appts } = await db()
      .from("appointments")
      .select("id, status, slot_id, patient_availability_json, updated_at")
      .eq("referral_id", ref.id)
      .order("updated_at", { ascending: false });
    const live = appts?.find((a) => a.status !== "cancelled") ?? appts?.[0];
    if (live) {
      const { data: slot } = await db()
        .from("slots")
        .select("starts_at, ends_at, held_until, institution_id")
        .eq("id", live.slot_id)
        .single();
      if (slot) {
        appointment = {
          id: live.id,
          status: live.status,
          startsAt: slot.starts_at,
          endsAt: slot.ends_at,
          heldUntil: slot.held_until,
          institution: slot.institution_id === ref.institution_id ? referral.institution : await institutionCard(slot.institution_id),
          availability: live.patient_availability_json,
        };
      }
    }
  }

  // Direct and emergency routes: recompute so "open now" is true at view time.
  let places: Place[] = [];
  let anyOpen = false;
  if (c.patient_lat != null && c.patient_lng != null && (c.status === "routed_direct" || c.status === "emergency_escalated")) {
    const specialty =
      c.status === "emergency_escalated" ? "hitna-medicina-ohbp" : SPECIALTY_BY_ROLE[(c.target_role as Role) ?? "stomatolog"];
    ({ places, anyOpen } = await nearestPreferOpen({ specialty, lat: c.patient_lat, lng: c.patient_lng, limit: 3 }));
  }

  return {
    id: c.id,
    status: c.status,
    route: c.route,
    urgency: c.urgency,
    targetRole: (c.target_role as Role) ?? null,
    city: c.patient_city,
    createdAt: c.created_at,
    summary: (c.summary_json as CaseSummary | null) ?? null,
    events: (events ?? []).map((e) => ({ ...e, payload: (e.payload ?? {}) as Record<string, unknown> })),
    referral,
    appointment,
    offers: (offers ?? []).map((o) => ({
      id: o.id,
      kind: o.kind,
      payload: (o.payload ?? {}) as Record<string, unknown>,
      createdAt: o.created_at,
    })),
    places,
    anyOpen,
  };
}
