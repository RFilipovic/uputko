"use client";

import { Check, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { hr } from "@/i18n/hr";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";

export type PersonaSummary = {
  id: string;
  name: string;
  age: number;
  homeCity: string;
  note: string | null;
};

/** Pick one of the synthetic demo personas (no real login). */
export function PersonaPicker({
  personas,
  currentId,
}: {
  personas: PersonaSummary[];
  currentId: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState(false);

  async function choose(id: string) {
    setBusy(id);
    setError(false);
    const res = await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: id }),
    }).catch(() => null);
    setBusy(null);
    if (!res?.ok) return setError(true);
    router.refresh();
  }

  return (
    <ul className="flex flex-col gap-3">
      {personas.map((p) => {
        const active = p.id === currentId;
        return (
          <li
            key={p.id}
            className={cn(
              ui.card,
              "flex flex-col gap-3",
              active && "border-2 border-primary",
            )}
          >
            <div className="flex items-start gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary dark:text-foreground">
                <UserRound aria-hidden className="size-6" />
              </span>
              <div>
                <p className="text-xl font-bold">{p.name}</p>
                <p className="text-base text-muted-foreground">
                  {p.age} {hr.profile.years} · {hr.profile.lives}: {p.homeCity}
                </p>
                {p.note && <p className="mt-1 text-base">{p.note}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => choose(p.id)}
              disabled={active || busy !== null}
              aria-pressed={active}
              className={active ? ui.btnSecondary : ui.btnPrimary}
            >
              {active ? (
                <>
                  <Check aria-hidden className="size-5" /> {hr.profile.chosen}
                </>
              ) : busy === p.id ? (
                hr.profile.loading
              ) : (
                hr.profile.choose
              )}
            </button>
          </li>
        );
      })}
      {error && (
        <li role="alert" className="text-base font-medium text-urgent">
          {hr.chat.errors.generic}
        </li>
      )}
    </ul>
  );
}
