import { Database } from "lucide-react";
import Link from "next/link";
import { hr } from "@/i18n/hr";
import { cn } from "@/lib/utils";

/**
 * Where this record comes from ("Izvor: HZZO (data.gov.hr)"). Links to the
 * open-data page so judges and patients can see the provenance.
 */
export function SourceChip({
  dataset,
  label,
  className,
}: {
  /** source_dataset value from the database, e.g. "hzzo_ugovoreni…". */
  dataset?: string | null;
  /** Ready-made text, when there is no dataset id (e.g. chosen doctors). */
  label?: string;
  className?: string;
}) {
  const text = label ?? (dataset ? hr.sources.label(dataset) : null);
  if (!text) return null;
  return (
    <Link
      href="/javni-podaci"
      className={cn(
        "inline-flex min-h-8 w-fit items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
      title={hr.sources.more}
    >
      <Database aria-hidden className="size-3.5 shrink-0" />
      {text}
    </Link>
  );
}
