import { hr } from "@/i18n/hr";
import { cn } from "@/lib/utils";

const tone: Record<string, string> = {
  emergency_escalated: "bg-urgent-deep text-white",
  appointment_confirmed: "bg-success text-success-foreground",
  routed_direct: "bg-success text-success-foreground",
  appointment_proposed: "bg-primary text-primary-foreground",
  referral_issued: "bg-primary text-primary-foreground",
};

export function StatusPill({ status }: { status: string }) {
  const label = (hr.case.statuses as Record<string, string>)[status] ?? status;
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-4 py-1.5 text-base font-semibold",
        tone[status] ?? "bg-muted text-foreground",
      )}
    >
      {label}
    </span>
  );
}
