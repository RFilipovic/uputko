import { hr } from "@/i18n/hr";
import { formatWhen } from "@/lib/format";

/** What has happened so far, oldest first (driven by case_events). */
export function CaseTimeline({
  events,
}: {
  events: Array<{ id: number; kind: string; at: string }>;
}) {
  const shown = events.filter((e) => hr.case.events[e.kind]);
  if (!shown.length) return null;
  return (
    <section aria-labelledby="timeline-title" className="flex flex-col gap-3">
      <h2 id="timeline-title" className="text-xl font-bold">
        {hr.case.timeline}
      </h2>
      <ol className="relative flex flex-col gap-4 border-l-2 border-border pl-6">
        {shown.map((e, i) => (
          <li key={e.id} className="relative">
            <span
              aria-hidden
              className={`absolute top-1.5 -left-[33px] size-4 rounded-full border-2 border-background ${i === shown.length - 1 ? "bg-primary" : "bg-muted-foreground/50"}`}
            />
            <p className="text-lg font-semibold">{hr.case.events[e.kind]}</p>
            <p className="text-base text-muted-foreground">
              {formatWhen(e.at)}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
