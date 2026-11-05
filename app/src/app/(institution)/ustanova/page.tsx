import { Building2 } from "lucide-react";
import type { Metadata } from "next";
import { StatusPill } from "@/components/case/StatusPill";
import { BookingActions } from "@/components/institution/BookingActions";
import { formatWhen } from "@/lib/format";
import {
  earlierBookedSlot,
  listBookings,
  slotsMatching,
} from "@/lib/institution";
import { ui } from "@/lib/ui";
import { hr } from "@/i18n/hr";

export const metadata: Metadata = {
  title: `${hr.institution.title} · ${hr.app.name}`,
  robots: { index: false },
};
export const dynamic = "force-dynamic";

const APPT_STATUS: Record<string, string> = {
  proposed: "appointment_proposed",
  confirmed: "appointment_confirmed",
  reschedule_requested: "reschedule_requested",
};

export default async function InstitutionPage() {
  const bookings = await listBookings();
  const rows = await Promise.all(
    bookings.map(async (b) => ({
      b,
      canFree: b.status === "confirmed" && Boolean(await earlierBookedSlot(b)),
      slots: b.status === "reschedule_requested" ? await slotsMatching(b) : [],
    })),
  );
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-4">
          <Building2
            aria-hidden
            className="size-7 text-primary dark:text-foreground"
          />
          <h1 className="text-2xl font-bold">{hr.institution.title}</h1>
        </div>
      </header>
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
        <p className="text-lg text-muted-foreground">{hr.institution.lead}</p>
        <h2 className="text-2xl font-bold">{hr.institution.bookings}</h2>
        {rows.length === 0 && (
          <p className={`${ui.card} text-lg`}>{hr.institution.empty}</p>
        )}
        <ul className="flex flex-col gap-4">
          {rows.map(({ b, canFree, slots }) => (
            <li
              key={b.appointmentId}
              className={`${ui.card} grid gap-4 md:grid-cols-[1fr_1fr]`}
            >
              <div className="flex flex-col gap-1">
                <p className="text-xl font-bold">{b.patientName}</p>
                <p className="text-lg">{b.specialtyName}</p>
                <p className="text-lg">{b.institutionName}</p>
                <p className="text-lg font-semibold">
                  {formatWhen(b.startsAt)}
                </p>
                <StatusPill status={APPT_STATUS[b.status] ?? b.status} />
                {b.availability && (
                  <p className="text-base text-muted-foreground">
                    {hr.institution.availability}:{" "}
                    {b.availability.days
                      .map(
                        (d) =>
                          `${d.date.slice(8)}.${d.date.slice(5, 7)}. (${d.parts.map((p) => (p === "morning" ? hr.appointment.availability.morning : hr.appointment.availability.afternoon).toLowerCase()).join(", ")})`,
                      )
                      .join("; ")}
                  </p>
                )}
              </div>
              <BookingActions
                appointmentId={b.appointmentId}
                canFree={canFree}
                slots={slots.map((s) => ({
                  id: s.id,
                  label: formatWhen(s.starts_at),
                }))}
              />
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
