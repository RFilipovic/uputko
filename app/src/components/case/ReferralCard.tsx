import { FileText } from "lucide-react";
import type { CaseView } from "@/lib/caseData";
import { hr } from "@/i18n/hr";
import { ui } from "@/lib/ui";

export function ReferralCard({
  referral,
}: {
  referral: NonNullable<CaseView["referral"]>;
}) {
  const rows: Array<[string, string]> = [
    [hr.referral.type, referral.type],
    [hr.referral.specialty, referral.specialtyName],
    [
      hr.referral.priority,
      hr.referral.priorities[referral.priority] ?? referral.priority,
    ],
    [hr.referral.institution, referral.institution?.name ?? "—"],
  ];
  if (referral.note) rows.push([hr.referral.note, referral.note]);
  return (
    <section
      aria-labelledby="ref-title"
      className={`${ui.card} flex animate-in flex-col gap-3 duration-300 fade-in slide-in-from-bottom-2`}
    >
      <h2 id="ref-title" className="flex items-center gap-2 text-2xl font-bold">
        <FileText
          aria-hidden
          className="size-7 text-primary dark:text-foreground"
        />
        {hr.referral.title}
      </h2>
      <dl className="grid gap-2">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className={ui.label}>{k}</dt>
            <dd className="text-lg font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      {referral.doctorName && (
        <p className="text-base text-muted-foreground">
          {hr.referral.issuedBy(referral.doctorName)}
        </p>
      )}
      {referral.hasDocument && (
        <a
          href={`/api/referrals/${referral.id}/document`}
          target="_blank"
          rel="noreferrer"
          className={ui.btnSecondary}
        >
          {hr.referral.document}
        </a>
      )}
      <p className="text-sm text-muted-foreground">{hr.referral.demo}</p>
    </section>
  );
}
