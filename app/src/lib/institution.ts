import { db } from "@/lib/db/server";

export type Booking = {
  appointmentId: string;
  status: string;
  patientName: string;
  institutionName: string;
  specialtyName: string;
  startsAt: string;
  institutionId: string;
  specialtyCode: string;
  availability: {
    days: Array<{ date: string; parts: Array<"morning" | "afternoon"> }>;
  } | null;
};

/** All live Uputko bookings (demo panel; synthetic patients only). */
export async function listBookings(): Promise<Booking[]> {
  const { data } = await db()
    .from("appointments")
    .select(
      "id, status, patient_availability_json, patients(name), slots(starts_at, institution_id, specialty_code, institutions(name), specialties(name))",
    )
    .neq("status", "cancelled")
    .order("updated_at", { ascending: false })
    .limit(30);
  return (data ?? []).map((a) => {
    const slot = a.slots as unknown as {
      starts_at: string;
      institution_id: string;
      specialty_code: string;
      institutions: { name: string } | null;
      specialties: { name: string } | null;
    };
    return {
      appointmentId: a.id,
      status: a.status,
      patientName:
        (a.patients as unknown as { name: string } | null)?.name ?? "",
      institutionName: slot.institutions?.name ?? "",
      specialtyName: slot.specialties?.name ?? slot.specialty_code,
      startsAt: slot.starts_at,
      institutionId: slot.institution_id,
      specialtyCode: slot.specialty_code,
      availability:
        (a.patient_availability_json as Booking["availability"]) ?? null,
    };
  });
}

/** Free slots at the same place that fit the patient's chosen days and parts of day. */
export async function slotsMatching(b: Booking, limit = 4) {
  if (!b.availability?.days.length) return [];
  const { data } = await db()
    .from("slots")
    .select("id, starts_at")
    .eq("institution_id", b.institutionId)
    .eq("specialty_code", b.specialtyCode)
    .eq("status", "free")
    .gt("starts_at", new Date(Date.now() + 2 * 3600_000).toISOString())
    .order("starts_at")
    .limit(400);
  const wanted = new Map(
    b.availability.days.map((d) => [d.date, new Set(d.parts)]),
  );
  return (data ?? [])
    .filter((s) => {
      const local = new Date(
        new Date(s.starts_at).toLocaleString("en-US", {
          timeZone: "Europe/Zagreb",
        }),
      );
      const date = `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
      const parts = wanted.get(date);
      if (!parts) return false;
      return parts.has(local.getHours() < 12 ? "morning" : "afternoon");
    })
    .slice(0, limit);
}

/** A booked synthetic slot earlier than this booking (to simulate someone cancelling). */
export async function earlierBookedSlot(b: Booking) {
  const { data } = await db()
    .from("slots")
    .select("id, starts_at")
    .eq("institution_id", b.institutionId)
    .eq("specialty_code", b.specialtyCode)
    .eq("status", "booked")
    .gt("starts_at", new Date(Date.now() + 3 * 3600_000).toISOString())
    .lt("starts_at", b.startsAt)
    .order("starts_at")
    .limit(1);
  return data?.[0] ?? null;
}
