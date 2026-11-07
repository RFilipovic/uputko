import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CaseScreen } from "@/components/case/CaseScreen";
import { Always112Banner } from "@/components/emergency/Always112Banner";
import { AppHeader } from "@/components/layout/AppHeader";
import { loadCaseView } from "@/lib/caseData";
import { currentPatientId } from "@/lib/session";
import { hr } from "@/i18n/hr";

export const metadata: Metadata = {
  title: `${hr.case.title} · ${hr.app.name}`,
};
export const dynamic = "force-dynamic";

export default async function CasePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patientId = await currentPatientId();
  if (!patientId) redirect(`/profil?next=/slucaj/${id}`);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const view = await loadCaseView(id, patientId);
  if (!view) notFound();
  return (
    // Phone: normal page scroll. Laptop: full screen like the chat — the page
    // itself does not scroll, only the content under the header.
    <div className="relative flex min-h-dvh flex-col bg-background lg:h-dvh lg:min-h-0 lg:overflow-hidden lg:overscroll-none">
      <Always112Banner />
      <AppHeader
        backHref="/"
        title={hr.case.title}
        className="mx-auto max-w-5xl"
      />
      <CaseScreen initial={view} patientId={patientId} />
    </div>
  );
}
