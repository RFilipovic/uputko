import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CaseScreen } from "@/components/case/CaseScreen";
import { Always112Banner } from "@/components/emergency/Always112Banner";
import { AppHeader } from "@/components/layout/AppHeader";
import { PhoneFrame } from "@/components/layout/PhoneFrame";
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
    <PhoneFrame>
      <Always112Banner />
      <AppHeader backHref="/" title={hr.case.title} />
      <CaseScreen initial={view} patientId={patientId} />
    </PhoneFrame>
  );
}
