import { Compass } from "lucide-react";
import Link from "next/link";
import { TextSizeToggle } from "@/components/settings/TextSizeToggle";
import { hr } from "@/i18n/hr";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-2xl flex-wrap items-center justify-between gap-3 px-5 py-4">
      <Link
        href="/"
        aria-label={hr.app.homeLabel}
        className="flex min-h-12 items-center gap-3 rounded-2xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="grid size-11 place-items-center rounded-2xl text-white bg-brand-gradient">
          <Compass aria-hidden className="size-6" strokeWidth={2.25} />
        </span>
        <span className="text-2xl font-bold tracking-tight">{hr.app.name}</span>
      </Link>
      <TextSizeToggle />
    </header>
  );
}
