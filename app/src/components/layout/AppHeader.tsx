import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { BrandMark } from "@/components/layout/BrandMark";
import { TextSizeToggle } from "@/components/settings/TextSizeToggle";
import { ThemeToggle } from "@/components/settings/ThemeToggle";
import { hr } from "@/i18n/hr";
import { cn } from "@/lib/utils";

/** Top bar: logo (or a back link) on the left, display settings on the right. */
export function AppHeader({
  backHref,
  title,
  className,
}: {
  backHref?: string;
  title?: string;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4",
        className,
      )}
    >
      {backHref ? (
        <Link
          href={backHref}
          className="flex min-h-12 items-center gap-2 rounded-2xl pr-2 text-lg font-semibold focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <ArrowLeft aria-hidden className="size-6" />
          <span>{title ?? hr.nav.back}</span>
          {title ? <span className="sr-only">— {hr.nav.back}</span> : null}
        </Link>
      ) : (
        <Link
          href="/"
          aria-label={hr.app.homeLabel}
          className="flex min-h-12 items-center gap-3 rounded-2xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <BrandMark />
          <span className="text-2xl font-bold tracking-tight">
            {hr.app.name}
          </span>
        </Link>
      )}
      <div className="flex items-center gap-2">
        <TextSizeToggle compact={Boolean(backHref)} />
        <ThemeToggle />
      </div>
    </header>
  );
}
