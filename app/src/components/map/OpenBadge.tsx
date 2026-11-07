import { Clock } from "lucide-react";
import { hhmm } from "@/lib/format";
import { hr } from "@/i18n/hr";
import { cn } from "@/lib/utils";

export type OpenInfo = {
  open_now?: boolean | null;
  closes_at?: string | null;
  has_hours?: boolean | null;
};

/** "Otvoreno do 20:00" / "Sada zatvoreno" / "Otvoreno 0–24", computed from today's hours. */
export function OpenBadge({
  info,
  emergency = false,
  className,
}: {
  info: OpenInfo | null | undefined;
  emergency?: boolean;
  className?: string;
}) {
  const open = info?.open_now === true;
  const unknown =
    !emergency && (!info || info.has_hours === false || info.open_now == null);
  const text = emergency
    ? hr.emergency.open24
    : unknown
      ? hr.direct.hoursUnknown
      : open
        ? info?.closes_at && info.closes_at < "24"
          ? hr.direct.openUntil(hhmm(info.closes_at))
          : hr.direct.openNow
        : hr.direct.closedNow;
  return (
    <p
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-base font-semibold",
        emergency
          ? "bg-urgent/10 text-urgent dark:text-foreground"
          : open
            ? "bg-success/15 text-success"
            : "bg-muted text-muted-foreground",
        className,
      )}
    >
      {open && !emergency ? (
        <span aria-hidden className="relative flex size-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
          <span className="relative inline-flex size-2.5 rounded-full bg-success" />
        </span>
      ) : (
        <Clock aria-hidden className="size-4" />
      )}
      {text}
    </p>
  );
}
