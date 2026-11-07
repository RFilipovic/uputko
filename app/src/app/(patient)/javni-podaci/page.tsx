import { ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import { z } from "zod";
import { Always112Banner } from "@/components/emergency/Always112Banner";
import { AppHeader } from "@/components/layout/AppHeader";
import { InstitutionMap } from "@/components/map/InstitutionMap";
import { db } from "@/lib/db/server";
import { ui } from "@/lib/ui";
import { hr } from "@/i18n/hr";

const t = hr.openData;

export const metadata: Metadata = {
  title: `${t.title} · ${hr.app.name}`,
};
// Counts change only when the seed is rebuilt; cache for an hour.
export const revalidate = 3600;

const Stats = z.object({
  institutions: z.number(),
  hospitals: z.number(),
  emergency: z.number(),
  linked: z.number(),
  cities: z.number(),
  practitioners: z.record(z.string(), z.number()),
  top_cities: z.array(
    z.object({
      city: z.string(),
      count: z.number(),
      lat: z.number(),
      lng: z.number(),
    }),
  ),
});

const num = (n: number) => n.toLocaleString("hr-HR");

async function loadStats() {
  try {
    const { data, error } = await db().rpc("open_data_stats");
    if (error) return null;
    const parsed = Stats.safeParse(data);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export default async function OpenDataPage() {
  const s = await loadStats();
  const practitioners = s
    ? Object.values(s.practitioners).reduce((a, b) => a + b, 0)
    : 0;
  const tiles: Array<[string, number]> = s
    ? [
        [t.stats.practitioners, practitioners],
        [t.stats.institutions, s.institutions],
        [t.stats.hospitals, s.hospitals],
        [t.stats.emergency, s.emergency],
        [t.stats.linked, s.linked],
        [t.stats.cities, s.cities],
      ]
    : [];
  const roles = ["obiteljski", "stomatolog", "pedijatar", "ginekolog"] as const;

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <Always112Banner />
      <AppHeader backHref="/" title={t.title} className="mx-auto max-w-5xl" />
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-5 pt-2 pb-12">
        <section className="flex flex-col gap-3" aria-labelledby="od-title">
          <h1 id="od-title" className="text-3xl leading-tight font-bold">
            {t.title}
          </h1>
          <p className="text-lg leading-relaxed text-foreground/85">{t.lead}</p>
        </section>

        {!s ? (
          <p role="alert" className={`${ui.card} text-lg`}>
            {t.error}
          </p>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {tiles.map(([label, value]) => (
                <li key={label} className={`${ui.card} flex flex-col gap-1`}>
                  <span className="text-3xl font-bold tabular-nums">
                    {num(value)}
                  </span>
                  <span className="text-base text-muted-foreground">
                    {label}
                  </span>
                </li>
              ))}
            </ul>

            <section
              className={`${ui.card} flex flex-col gap-3`}
              aria-labelledby="roles-title"
            >
              <h2 id="roles-title" className="text-xl font-bold">
                {t.roles}
              </h2>
              <ul className="grid gap-3">
                {roles.map((r) => {
                  const n = s.practitioners[r] ?? 0;
                  const pct = practitioners ? (n / practitioners) * 100 : 0;
                  return (
                    <li key={r} className="grid gap-1">
                      <p className="flex justify-between gap-3 text-lg">
                        <span>{hr.roles[r]}</span>
                        <span className="font-semibold tabular-nums">
                          {num(n)}
                        </span>
                      </p>
                      <div
                        aria-hidden
                        className="h-2.5 overflow-hidden rounded-full bg-muted"
                      >
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section
              className="flex flex-col gap-3"
              aria-labelledby="cities-title"
            >
              <h2 id="cities-title" className="text-2xl font-bold">
                {t.citiesTitle}
              </h2>
              <p className="text-base text-muted-foreground">{t.citiesNote}</p>
              <InstitutionMap
                className="h-72"
                points={s.top_cities.map((c) => ({
                  lat: c.lat,
                  lng: c.lng,
                  label: `${c.city}: ${c.count}`,
                  kind: "place",
                }))}
              />
              <ol className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                {s.top_cities.map((c) => (
                  <li
                    key={c.city}
                    className="flex justify-between gap-3 border-b border-border py-2 text-lg"
                  >
                    <span>{c.city}</span>
                    <span className="font-semibold tabular-nums">
                      {num(c.count)}
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}

        <section className="flex flex-col gap-3" aria-labelledby="ds-title">
          <h2 id="ds-title" className="text-2xl font-bold">
            {t.datasetsTitle}
          </h2>
          <p className="text-base text-muted-foreground">{t.datasetsNote}</p>
          <ul className="flex flex-col gap-3">
            {t.datasets.map((d) => (
              <li key={d.url} className={`${ui.card} flex flex-col gap-1`}>
                <p className="text-lg font-semibold">{d.name}</p>
                <p className="text-base text-muted-foreground">
                  {d.publisher} · {d.use}
                </p>
                <a
                  href={d.url}
                  target="_blank"
                  rel="noreferrer"
                  className={`${ui.btnLink} self-start`}
                >
                  <ExternalLink aria-hidden className="size-4" />
                  {t.open}
                  <span className="sr-only">: {d.name}</span>
                </a>
              </li>
            ))}
          </ul>
          <h3 className="mt-2 text-lg font-bold">{t.other}</h3>
          <ul className="list-disc pl-6 text-lg">
            {t.otherSources.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
          <p className="rounded-2xl bg-muted p-4 text-base">{t.synthetic}</p>
        </section>
      </main>
    </div>
  );
}
