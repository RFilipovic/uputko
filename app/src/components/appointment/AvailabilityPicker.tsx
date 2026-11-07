"use client";

import { useMemo, useState } from "react";
import { hr } from "@/i18n/hr";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Part = "morning" | "afternoon";
export type Availability = { days: Array<{ date: string; parts: Part[] }> };

/** Next 10 working days × morning/afternoon. Large toggles, keyboard friendly. */
function nextWorkingDays(n: number) {
  const out: Date[] = [];
  const d = new Date();
  while (out.length < n) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) out.push(new Date(d));
  }
  return out;
}
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function AvailabilityPicker({
  onSubmit,
  onCancel,
  busy,
}: {
  onSubmit: (a: Availability) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const days = useMemo(() => nextWorkingDays(10), []);
  const [chosen, setChosen] = useState<Record<string, Set<Part>>>({});
  const [error, setError] = useState(false);

  function toggle(date: string, part: Part) {
    setChosen((c) => {
      const s = new Set(c[date] ?? []);
      if (s.has(part)) s.delete(part);
      else s.add(part);
      return { ...c, [date]: s };
    });
    setError(false);
  }

  function submit() {
    const list = Object.entries(chosen)
      .filter(([, s]) => s.size > 0)
      .map(([date, s]) => ({ date, parts: [...s] }));
    if (!list.length) return setError(true);
    onSubmit({ days: list });
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-xl font-bold">
        {hr.appointment.availability.title}
      </legend>
      <p className="text-base text-muted-foreground">
        {hr.appointment.availability.body}
      </p>
      <ul className="flex flex-col gap-2">
        {days.map((d) => {
          const key = iso(d);
          return (
            <li key={key} className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-base font-semibold">
                {hr.daysShort[d.getDay()]} {d.getDate()}. {d.getMonth() + 1}.
              </span>
              {(["morning", "afternoon"] as Part[]).map((part) => {
                const on = chosen[key]?.has(part) ?? false;
                return (
                  <button
                    key={part}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(key, part)}
                    className={cn(
                      "min-h-12 flex-1 rounded-xl border-2 px-2 text-base font-semibold transition-colors focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary",
                    )}
                  >
                    {part === "morning"
                      ? hr.appointment.availability.morning
                      : hr.appointment.availability.afternoon}
                  </button>
                );
              })}
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="text-base font-medium text-urgent">
          {hr.appointment.availability.needOne}
        </p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className={`${ui.btnPrimary} flex-1`}
          onClick={submit}
          disabled={busy}
        >
          {hr.appointment.availability.send}
        </button>
        <button
          type="button"
          className={`${ui.btnSecondary} flex-1`}
          onClick={onCancel}
          disabled={busy}
        >
          {hr.appointment.availability.cancel}
        </button>
      </div>
    </fieldset>
  );
}
