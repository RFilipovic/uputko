import { ArrowRight, Mic } from "lucide-react";
import Link from "next/link";
import { Always112Banner } from "@/components/emergency/Always112Banner";
import { AppHeader } from "@/components/layout/AppHeader";
import { hr } from "@/i18n/hr";

const t = hr.landing;

export default function Home() {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-hidden">
      {/* Soft brand glow — decorative only, never behind text that needs contrast. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34rem] opacity-60 dark:opacity-40"
        style={{
          background:
            "radial-gradient(60% 70% at 15% 0%, rgb(255 107 211 / 0.35), transparent 70%), radial-gradient(60% 70% at 90% 10%, rgb(87 61 254 / 0.3), transparent 70%)",
        }}
      />

      <Always112Banner />
      <AppHeader className="mx-auto max-w-2xl" />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-12 px-5 pt-6 pb-12 sm:pt-12">
        <section
          aria-labelledby="hero-title"
          className="flex animate-in flex-col gap-5 duration-300 ease-out fade-in slide-in-from-bottom-2"
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
              className="inline-flex min-h-16 flex-1 items-center justify-center gap-3 rounded-2xl bg-primary px-6 text-xl font-semibold text-primary-foreground shadow-[0_10px_30px_-10px_rgb(87_61_254/0.7)] transition-colors duration-200 hover:bg-violet-deep focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {t.cta}
              <ArrowRight aria-hidden className="size-6" />
            </Link>
            <Link
              href="/chat?glas=1"
              className="inline-flex min-h-16 items-center justify-center gap-3 rounded-2xl border-2 border-border bg-card px-6 text-xl font-semibold transition-colors duration-200 hover:border-primary focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="grid size-9 place-items-center rounded-full bg-pink text-ink">
                <Mic aria-hidden className="size-5" />
              </span>
              {t.voice}
            </Link>
          </div>
        </section>

        <section aria-labelledby="steps-title" className="flex flex-col gap-5">
          <h2 id="steps-title" className="text-2xl font-bold">
            {t.stepsTitle}
          </h2>
          <ol className="flex flex-col gap-3">
            {t.steps.map((step, i) => (
              <li
                key={step.title}
                className="flex items-start gap-4 rounded-2xl border border-border bg-card p-5"
              >
                <span
                  aria-hidden
                  className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground"
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-xl font-semibold">{step.title}</p>
                  <p className="mt-1 text-lg text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <footer className="mt-auto flex flex-col gap-3 border-t border-border pt-6 text-base text-muted-foreground">
          <p>{hr.disclaimer}</p>
          <p className="text-sm">{hr.app.demoBadge}</p>
        </footer>
      </main>
    </div>
  );
}
