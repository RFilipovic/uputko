"use client";

import {
  Check,
  ChevronDown,
  Download,
  FileUp,
  MapPin,
  Send,
  UserCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { hr } from "@/i18n/hr";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";

type Option = { code: string; name: string };
type Inst = {
  id: string;
  name: string;
  city: string | null;
  distance_km: number;
};
type Extract = {
  extracted: {
    referral_type: string | null;
    priority: "redovna" | "prioritetna" | "hitna" | null;
    note: string | null;
  };
  specialtyCode: string | null;
  specialties: Option[];
  institutionId: string | null;
  institutionMatched: boolean;
  institutions: Inst[];
};

const TYPES = ["A1", "A2", "A3"]; // TODO(verify): full uputnica type list with HZZO rules
const PRIORITIES = ["redovna", "prioritetna", "hitna"] as const;

/** A native dropdown with a visible arrow, so it is obviously clickable. */
function Select({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1">
      <span className={ui.label}>{label}</span>
      <span className="relative">
        <select
          className={`${ui.input} cursor-pointer appearance-none pr-12`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-muted-foreground"
        />
      </span>
    </label>
  );
}

/** A small keyboard key hint, e.g. <Kbd>U</Kbd>. */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-sans text-sm font-semibold text-foreground">
      {children}
    </kbd>
  );
}

/** Typing in a field must never trigger a shortcut. */
const typing = (t: EventTarget | null) =>
  t instanceof HTMLElement &&
  (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

/**
 * Upload the uputnica → check what was read → send to the patient (or invite
 * to an exam). Three clicks at most; keyboard: U upload, Ctrl+Enter send.
 */
export function DoctorDecision({ token }: { token: string }) {
  const fileRef = useRef<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [dragging, setDragging] = useState(false);
  const [state, setState] = useState<
    "idle" | "reading" | "review" | "sending" | "sent" | "invited"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Extract | null>(null);
  const [form, setForm] = useState({
    type: "A1",
    specialty: "",
    institution: "",
    priority: "redovna",
    note: "",
  });
  const [institutions, setInstitutions] = useState<Inst[]>([]);
  const [result, setResult] = useState<string | null>(null);

  async function onFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) return setError(hr.doctor.upload.tooBig);
    if (!["application/pdf", "image/jpeg", "image/png"].includes(f.type))
      return setError(hr.doctor.upload.badType);
    fileRef.current = f;
    setError(null);
    setState("reading");
    const body = new FormData();
    body.append("file", f);
    const res = await fetch(`/api/doctor/${token}/extract`, {
      method: "POST",
      body,
    }).catch(() => null);
    const json = (await res?.json().catch(() => null)) as
      (Extract & { message?: string }) | null;
    if (!res?.ok || !json) {
      setState("idle");
      return setError(json?.message ?? hr.doctor.upload.failed);
    }
    setData(json);
    setInstitutions(json.institutions);
    setForm({
      type:
        json.extracted.referral_type &&
        TYPES.includes(json.extracted.referral_type)
          ? json.extracted.referral_type
          : "A1",
      specialty: json.specialtyCode ?? json.specialties[0]?.code ?? "",
      institution: json.institutionId ?? "",
      priority: json.extracted.priority ?? "redovna",
      note: json.extracted.note ?? "",
    });
    setState("review");
  }

  async function changeSpecialty(code: string) {
    setForm((f) => ({ ...f, specialty: code, institution: "" }));
    const res = await fetch(
      `/api/doctor/${token}/institutions?specialty=${code}`,
    ).catch(() => null);
    const json = (await res?.json().catch(() => null)) as {
      institutions?: Inst[];
    } | null;
    const list = json?.institutions ?? [];
    setInstitutions(list);
    setForm((f) => ({ ...f, institution: list[0]?.id ?? "" }));
  }

  async function send() {
    if (!fileRef.current || !form.institution)
      return setError(hr.doctor.upload.unknownInstitution);
    setState("sending");
    setError(null);
    const body = new FormData();
    body.append("file", fileRef.current);
    Object.entries(form).forEach(([k, v]) => body.append(k, v));
    const res = await fetch(`/api/doctor/${token}/issue`, {
      method: "POST",
      body,
    }).catch(() => null);
    const json = (await res?.json().catch(() => null)) as {
      when?: string | null;
      movedTo?: string | null;
      message?: string;
    } | null;
    if (!res?.ok) {
      setState("review");
      return setError(json?.message ?? hr.doctor.upload.failed);
    }
    setResult(
      json?.when
        ? json.movedTo
          ? hr.doctor.upload.sentElsewhere(json.when, json.movedTo)
          : hr.doctor.upload.sentAppointment(json.when)
        : hr.doctor.upload.sentNoSlot,
    );
    setState("sent");
  }

  async function invite() {
    const res = await fetch(`/api/doctor/${token}/invite`, {
      method: "POST",
    }).catch(() => null);
    if (!res?.ok) return setError(hr.doctor.upload.failed);
    setState("invited");
  }

  // Keyboard shortcuts for a doctor working through many cases.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && state === "review") {
        e.preventDefault();
        formRef.current?.requestSubmit();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      const k = e.key.toLowerCase();
      if (k === "u" && state === "idle") {
        e.preventDefault();
        inputRef.current?.click();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state]);

  if (state === "sent" || state === "invited") {
    return (
      <div
        className={`${ui.card} flex flex-col gap-2 border-2 border-success`}
        role="status"
      >
        <p className="text-xl font-bold">
          {state === "sent" ? hr.doctor.upload.sent : hr.doctor.invited}
        </p>
        {result && <p className="text-lg">{result}</p>}
      </div>
    );
  }

  return (
    <section
      className={`${ui.card} flex flex-col gap-4`}
      aria-labelledby="decide-title"
    >
      <h2 id="decide-title" className="text-2xl font-bold">
        {state === "review"
          ? hr.doctor.upload.checkTitle
          : hr.doctor.upload.title}
      </h2>

      {state !== "review" && state !== "sending" && (
        <>
          <p className="text-lg text-muted-foreground">
            {hr.doctor.upload.body}
          </p>
          <label
            className={cn(
              "flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-5 text-center transition-colors duration-200 focus-within:ring-4 focus-within:ring-ring/50",
              dragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/60",
            )}
            aria-busy={state === "reading"}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              void onFile(e.dataTransfer.files?.[0]);
            }}
          >
            <span className={`${ui.btnPrimary} pointer-events-none w-full`}>
              <FileUp aria-hidden className="size-5" />
              {state === "reading"
                ? hr.doctor.upload.reading
                : hr.doctor.upload.choose}
            </span>
            <span className="text-base text-muted-foreground">
              {hr.doctor.upload.drop}
            </span>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              className="sr-only"
              disabled={state === "reading"}
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </label>
          {state === "reading" && (
            <div className={`${ui.skeleton} h-24`} aria-hidden />
          )}
          <a
            href="/demo/uputnica-ana-orl.png"
            download
            className={`${ui.btnLink} self-start`}
          >
            <Download aria-hidden className="size-4" />
            {hr.doctor.upload.sample}
          </a>
        </>
      )}

      {(state === "review" || state === "sending") && data && (
        <form
          ref={formRef}
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <p className="text-lg text-muted-foreground">
            {hr.doctor.upload.checkBody}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label={hr.referral.type}
              value={form.type}
              onChange={(v) => setForm({ ...form, type: v })}
            >
              {TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </Select>
            <Select
              label={hr.referral.priority}
              value={form.priority}
              onChange={(v) => setForm({ ...form, priority: v })}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {hr.referral.priorities[p]}
                </option>
              ))}
            </Select>
          </div>
          <Select
            label={hr.referral.specialty}
            value={form.specialty}
            onChange={(v) => void changeSpecialty(v)}
          >
            {data.specialties.map((sp) => (
              <option key={sp.code} value={sp.code}>
                {sp.name}
              </option>
            ))}
          </Select>
          <fieldset className="grid gap-2">
            <legend className={`${ui.label} mb-1`}>
              {hr.doctor.upload.pickInstitution}
            </legend>
            {!data.institutionMatched && (
              <p className="text-base text-muted-foreground">
                {hr.doctor.upload.unknownInstitution}
              </p>
            )}
            {institutions.length === 0 && (
              <p className="text-base text-muted-foreground">
                {hr.doctor.upload.noInstitutions}
              </p>
            )}
            {institutions.map((i) => {
              const chosen = form.institution === i.id;
              const fromReferral =
                data.institutionMatched && i.id === data.institutionId;
              return (
                <label
                  key={i.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-4 transition-colors focus-within:ring-4 focus-within:ring-ring/50",
                    chosen
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-primary/60",
                  )}
                >
                  <input
                    type="radio"
                    name="institution"
                    value={i.id}
                    checked={chosen}
                    onChange={() => setForm({ ...form, institution: i.id })}
                    className="sr-only"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-7 shrink-0 place-items-center rounded-full border-2",
                      chosen
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border",
                    )}
                  >
                    {chosen && <Check className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-semibold">
                      {i.name}
                    </span>
                    <span className="flex items-center gap-1 text-base text-muted-foreground">
                      <MapPin aria-hidden className="size-4" />
                      {i.city} · {i.distance_km.toFixed(1).replace(".", ",")} km{" "}
                      {hr.doctor.upload.fromPatient}
                    </span>
                  </span>
                  {fromReferral && (
                    <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-sm font-semibold">
                      {hr.doctor.upload.onReferral}
                    </span>
                  )}
                </label>
              );
            })}
          </fieldset>
          <label className="grid gap-1">
            <span className={ui.label}>{hr.referral.note}</span>
            <textarea
              className={`${ui.input} min-h-24 py-3`}
              value={form.note}
              maxLength={500}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              className={`${ui.btnPrimary} flex-1`}
              disabled={state === "sending"}
              aria-busy={state === "sending"}
            >
              <Send aria-hidden className="size-5" />
              {state === "sending"
                ? hr.doctor.upload.sending
                : hr.doctor.upload.send}
              <span className="hidden text-sm font-medium opacity-80 lg:inline">
                Ctrl+Enter
              </span>
            </button>
            <button
              type="button"
              className={ui.btnSecondary}
              onClick={() => setState("idle")}
              disabled={state === "sending"}
            >
              {hr.doctor.upload.retry}
            </button>
          </div>
        </form>
      )}

      {error && (
        <p role="alert" className="text-base font-medium text-urgent">
          {error}
        </p>
      )}

      {state === "idle" && (
        <button
          type="button"
          className={ui.btnSecondary}
          onClick={() => void invite()}
        >
          <UserCheck aria-hidden className="size-5" />
          {hr.doctor.invite}
        </button>
      )}

      {(state === "idle" || state === "review") && (
        <p className="hidden flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground lg:flex">
          <span className="font-semibold">{hr.doctor.shortcuts.title}</span>
          {state === "idle" ? (
            <>
              <span>
                <Kbd>U</Kbd> {hr.doctor.shortcuts.upload}
              </span>
            </>
          ) : (
            <span>
              <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> {hr.doctor.shortcuts.send}
            </span>
          )}
        </p>
      )}
    </section>
  );
}
