import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Always112Banner } from "@/components/emergency/Always112Banner";
import { AppHeader } from "@/components/layout/AppHeader";
import { SourceChip } from "@/components/data/SourceChip";
import { DemoBar } from "@/components/layout/DemoBar";
import { isDemo } from "@/lib/demo";
import { ChooseDoctors } from "@/components/onboarding/ChooseDoctors";
import {
  PersonaPicker,
  type PersonaSummary,
} from "@/components/onboarding/PersonaPicker";
import { db } from "@/lib/db/server";
import { getPatientProfile } from "@/lib/patients";
import { currentPatientId } from "@/lib/session";
import { ui } from "@/lib/ui";
import { hr } from "@/i18n/hr";

export const metadata: Metadata = {
  title: `${hr.landing.profile} · ${hr.app.name}`,
};
export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext =
    next?.startsWith("/") && !next.startsWith("//") ? next : "/chat";
  const { data: rows } = await db()
    .from("patients")
    .select("id, name, birth_year, home_city, note")
    .order("name");
  const personas: PersonaSummary[] = (rows ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    age: new Date().getFullYear() - p.birth_year,
    homeCity: p.home_city,
    note: p.note,
  }));
  const demo = await isDemo();
  const currentId = await currentPatientId();
  const current = currentId ? await getPatientProfile(currentId) : null;

  return (
    // Phone: normal page scroll. Laptop: full screen like the chat and case
    // pages — no phone frame; only the content under the header scrolls.
    <div className="relative flex min-h-dvh flex-col bg-background lg:h-dvh lg:min-h-0 lg:overflow-hidden lg:overscroll-none">
      <Always112Banner />
      <AppHeader
        backHref="/"
        title={hr.landing.profile}
        className="mx-auto max-w-5xl"
      />
      <main className="flex-1 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 pt-2 pb-8">
          <section
            className="flex flex-col gap-3"
            aria-labelledby="persona-title"
          >
            <h1 id="persona-title" className="text-3xl leading-tight font-bold">
              {hr.profile.title}
            </h1>
            <p className="text-lg text-muted-foreground">{hr.profile.lead}</p>
            <PersonaPicker
              personas={personas}
              currentId={current?.id ?? null}
            />
          </section>
          {demo && <DemoBar />}
          {current && (
            <>
              <Link href={safeNext} className={ui.btnPrimary}>
                {hr.profile.continue}
                <ArrowRight aria-hidden className="size-5" />
              </Link>
              <section
                className="flex flex-col gap-3"
                aria-labelledby="doctors-title"
              >
                <h2 id="doctors-title" className="text-2xl font-bold">
                  {hr.profile.myDoctors}
                </h2>
                <SourceChip label={hr.profile.source} />
                <ChooseDoctors doctors={current.doctors} />
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
