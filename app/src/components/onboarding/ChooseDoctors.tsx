"use client";

import { Search, Stethoscope } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { hr } from "@/i18n/hr";
import { ui } from "@/lib/ui";

type Role = "obiteljski" | "stomatolog" | "ginekolog" | "pedijatar";
type Doctor = { role: Role; full_name: string; institution_name: string; address: string | null; city: string | null };
type Result = { id: string; full_name: string; institution_name: string; address: string | null; city: string | null };

const ROLES: Role[] = ["obiteljski", "stomatolog", "ginekolog", "pedijatar"];

function RoleSearch({ role, onDone }: { role: Role; onDone: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [results, setResults] = useState<Result[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setState("idle");
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setState("loading");
      try {
        const res = await fetch(`/api/practitioners?role=${role}&q=${encodeURIComponent(q.trim())}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error();
        setResults(((await res.json()) as { results: Result[] }).results);
        setState("done");
      } catch (e) {
        if ((e as Error).name !== "AbortError") setState("error");
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q, role]);

  async function pick(id: string) {
    setSaving(id);
    const res = await fetch("/api/profile/doctors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, practitionerId: id }),
    }).catch(() => null);
    setSaving(null);
    if (!res?.ok) return setState("error");
    onDone();
    router.refresh();
  }

  const inputId = `search-${role}`;
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={inputId} className="text-base font-semibold">
        {hr.profile.searchLabel}
      </label>
      <div className="relative">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
        <input
          id={inputId}
          className={`${ui.input} pl-12`}
          placeholder={hr.profile.searchPlaceholder}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          aria-describedby={`${inputId}-status`}
        />
      </div>
      <p id={`${inputId}-status`} className="text-base text-muted-foreground" aria-live="polite">
        {state === "idle" && hr.profile.searchHint}
        {state === "done" && results.length === 0 && hr.profile.searchEmpty}
        {state === "error" && <span className="text-urgent">{hr.profile.searchError}</span>}
      </p>
      {state === "loading" && (
        <div className="flex flex-col gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${ui.skeleton} h-16`} />
          ))}
        </div>
      )}
      {state === "done" && results.length > 0 && (
        <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => pick(r.id)}
                disabled={saving !== null}
                className="w-full rounded-2xl border-2 border-border bg-card p-4 text-left transition-colors hover:border-primary focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="block text-lg font-semibold">dr. {r.full_name}</span>
                <span className="block text-base text-muted-foreground">
                  {[r.address, r.city].filter(Boolean).join(", ")}
                </span>
                {saving === r.id && <span className="text-base">{hr.profile.loading}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className={`${ui.btnLink} self-start`} onClick={onDone}>
        {hr.profile.cancel}
      </button>
    </div>
  );
}

/** The patient's chosen doctors (CareTeam), each changeable by searching open data. */
export function ChooseDoctors({ doctors }: { doctors: Doctor[] }) {
  const [editing, setEditing] = useState<Role | null>(null);
  return (
    <ul className="flex flex-col gap-3">
      {ROLES.map((role) => {
        const d = doctors.find((x) => x.role === role);
        return (
          <li key={role} className={`${ui.card} flex flex-col gap-3`}>
            <div className="flex items-start gap-3">
              <Stethoscope aria-hidden className="mt-1 size-6 shrink-0 text-primary dark:text-foreground" />
              <div className="min-w-0 flex-1">
                <p className={ui.label}>{hr.roles[role]}</p>
                {d ? (
                  <>
                    <p className="text-lg font-semibold">dr. {d.full_name}</p>
                    <p className="text-base text-muted-foreground">{[d.address, d.city].filter(Boolean).join(", ")}</p>
                  </>
                ) : (
                  <p className="text-lg text-muted-foreground">{hr.profile.noDoctor}</p>
                )}
              </div>
            </div>
            {editing === role ? (
              <RoleSearch role={role} onDone={() => setEditing(null)} />
            ) : (
              <button type="button" className={ui.btnSecondary} onClick={() => setEditing(role)}>
                {d ? hr.profile.change : hr.profile.add}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
