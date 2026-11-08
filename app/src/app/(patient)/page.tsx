import { ArrowRight, Database, Mic } from "lucide-react";
import Link from "next/link";
import { MyCases } from "@/components/case/MyCases";
import { Always112Banner } from "@/components/emergency/Always112Banner";
import { AppHeader } from "@/components/layout/AppHeader";
import { ui } from "@/lib/ui";
import { hr } from "@/i18n/hr";

const t = hr.landing;

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-hidden lg:h-dvh lg:overflow-hidden">
      {/* Soft brand glow — decorative only, never behind text that needs contrast. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] opacity-60"
        style={{
          background:
            "radial-gradient(60% 70% at 15% 0%, rgb(74 137 255 / 0.3), transparent 70%), radial-gradient(60% 70% at 90% 10%, rgb(0 40 171 / 0.22), transparent 70%)",
        }}
      />

      <Always112Banner />
      <AppHeader className="mx-auto max-w-2xl lg:max-w-6xl" />

      {/* Phones: one scrolling column. Large screens: one screen, no page
          scroll; hero + steps on the left, "Moji slučajevi" box on the right
          (only its list scrolls). */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-12 px-5 pt-6 pb-12 sm:pt-12 lg:grid lg:min-h-0 lg:max-w-6xl lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:grid-rows-[auto_auto_auto] lg:[align-content:safe_center] lg:gap-x-12 lg:gap-y-8 lg:overflow-y-auto lg:pt-4 lg:pb-6">
        <section
          aria-labelledby="hero-title"
          className="flex animate-in flex-col gap-5 duration-300 ease-out fade-in slide-in-from-bottom-2 lg:col-start-1 lg:row-start-1"
        >
          <h1
            id="hero-title"
            className="text-[2.5rem] leading-tight font-bold tracking-tight sm:text-5xl"
          >
            {t.title}
          </h1>
          <p className="text-xl leading-relaxed text-foreground/85">{t.lead}</p>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/chat"
              className="inline-flex min-h-16 flex-1 items-center justify-center gap-3 rounded-2xl bg-primary px-6 text-xl font-semibold text-primary-foreground shadow-[0_10px_30px_-10px_rgb(0_40_171/0.55)] transition-colors duration-200 hover:bg-primary-hover focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {t.cta}
              <ArrowRight aria-hidden className="size-6" />
            </Link>
            <Link
              href="/chat?glas=1"
              className="inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl border-2 border-border bg-card px-6 text-xl font-semibold transition-colors duration-200 hover:border-primary focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="grid size-9 place-items-center rounded-full bg-accent text-accent-foreground">
                <Mic aria-hidden className="size-5" />
              </span>
              {t.voice}
            </Link>
          </div>
        </section>

        <MyCases className="lg:col-start-2 lg:row-span-2 lg:row-start-1" />

        <section
          aria-labelledby="steps-title"
          className="flex flex-col gap-5 lg:col-start-1 lg:row-start-2"
        >
          <h2 id="steps-title" className="text-2xl font-bold">
            {t.stepsTitle}
          </h2>
          <ol className="flex flex-col gap-3 lg:grid lg:grid-cols-3">
            {t.steps.map((step, i) => (
              <li
                key={step.title}
                className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5 lg:flex-col lg:gap-3 lg:p-4"
              >
                <span
                  aria-hidden
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground lg:size-9 lg:text-lg"
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-xl font-semibold">{step.title}</p>
                  <p className="mt-1 text-lg text-muted-foreground lg:text-base">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-auto flex flex-col gap-3 border-t border-border pt-6 text-base text-muted-foreground lg:col-span-2 lg:row-start-3 lg:mt-0 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-6 lg:gap-y-1 lg:pt-4">
          <p>{hr.disclaimer}</p>
          <p className="text-sm">{hr.app.demoBadge}</p>
          <Link
            href="/javni-podaci"
            className={`${ui.btnLink} self-start lg:ml-auto lg:self-center`}
          >
            <Database aria-hidden className="size-4" />
            {hr.openData.title}
          </Link>
        </footer>
      </main>
    </div>
  );
}
