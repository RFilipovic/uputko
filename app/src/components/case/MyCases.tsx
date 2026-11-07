import { ChevronRight, UserRound } from "lucide-react";
import Link from "next/link";
import { StatusPill } from "@/components/case/StatusPill";
import type { CaseSummary } from "@/lib/agent/schemas";
import { db } from "@/lib/db/server";
import { formatWhen } from "@/lib/format";
import { getPatientProfile } from "@/lib/patients";
import { currentPatientId } from "@/lib/session";
import { ui } from "@/lib/ui";
import { hr } from "@/i18n/hr";

/** Landing: who am I (demo persona) and my recent cases. */
export async function MyCases() {
  const patientId = await currentPatientId();
  const patient = patientId ? await getPatientProfile(patientId) : null;
  if (!patient) return null;
  const { data: cases } = await db()
    .from("cases")
    .select("id, status, created_at, summary_json")
    .eq("patient_id", patient.id)
    .neq("status", "intake")
    .order("created_at", { ascending: false })
    .limit(5);
  return (
    <section aria-labelledby="mycases-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 id="mycases-title" className="text-2xl font-bold">
          {hr.landing.myCases}
        </h2>
        <Link href="/profil" className={ui.btnLink}>
          <UserRound aria-hidden className="size-5" />
          {patient.name}
        </Link>
      </div>
      {(cases ?? []).length === 0 ? (
        <p className="text-lg text-muted-foreground">
          {hr.notifications.empty}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {(cases ?? []).map((c) => (
            <li key={c.id}>
              <Link
                href={`/slucaj/${c.id}`}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold">
                    {(c.summary_json as CaseSummary | null)?.chief_complaint ??
                      hr.case.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatWhen(c.created_at)}
                  </p>
                  <div className="mt-1">
                    <StatusPill status={c.status} />
                  </div>
                </div>
                <ChevronRight
                  aria-hidden
                  className="size-6 shrink-0 text-muted-foreground"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
