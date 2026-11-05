import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Always112Banner } from "@/components/emergency/Always112Banner";
import { AppHeader } from "@/components/layout/AppHeader";
import { PhoneFrame } from "@/components/layout/PhoneFrame";
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
  const currentId = await currentPatientId();
  const current = currentId ? await getPatientProfile(currentId) : null;

  return (
    <PhoneFrame>
      <Always112Banner />
      <AppHeader backHref="/" title={hr.landing.profile} />
      <main className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 pt-2 pb-8">
        <section
          className="flex flex-col gap-3"
          aria-labelledby="persona-title"
        >
          <h1 id="persona-title" className="text-3xl leading-tight font-bold">
            {hr.profile.title}
          </h1>
          <p className="text-lg text-muted-foreground">{hr.profile.lead}</p>
          <PersonaPicker personas={personas} currentId={current?.id ?? null} />
        </section>
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
              <p className="text-sm text-muted-foreground">
                {hr.profile.source}
              </p>
              <ChooseDoctors doctors={current.doctors} />
            </section>
          </>
        )}
      </main>
    </PhoneFrame>
  );
}
