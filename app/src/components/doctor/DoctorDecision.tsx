"use client";

import { Download, FileUp, Send, UserCheck } from "lucide-react";
import { useRef, useState } from "react";
import { hr } from "@/i18n/hr";
import { ui } from "@/lib/ui";

type Option = { code: string; name: string };
type Inst = { id: string; name: string; city: string | null; distance_km: number };
type Extract = {
  extracted: { referral_type: string | null; priority: "redovna" | "prioritetna" | "hitna" | null; note: string | null };
  specialtyCode: string | null;
  specialties: Option[];
  institutionId: string | null;
  institutionMatched: boolean;
  institutions: Inst[];
};

const TYPES = ["A1", "A2", "A3"]; // TODO(verify): full uputnica type list with HZZO rules
const PRIORITIES = ["redovna", "prioritetna", "hitna"] as const;

/** Upload the uputnica → check what was read → send to the patient (or invite to an exam). */
export function DoctorDecision({ token }: { token: string }) {
  const fileRef = useRef<File | null>(null);
  const [state, setState] = useState<"idle" | "reading" | "review" | "sending" | "sent" | "invited">("idle");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Extract | null>(null);
  const [form, setForm] = useState({ type: "A1", specialty: "", institution: "", priority: "redovna", note: "" });
  const [institutions, setInstitutions] = useState<Inst[]>([]);
  const [result, setResult] = useState<string | null>(null);

  async function onFile(f: File | undefined) {
    if (!f) return;
    if (f.size > 4 * 1024 * 1024) return setError(hr.doctor.upload.tooBig);
    if (!["application/pdf", "image/jpeg", "image/png"].includes(f.type)) return setError(hr.doctor.upload.badType);
    fileRef.current = f;
    setError(null);
    setState("reading");
    const body = new FormData();
    body.append("file", f);
    const res = await fetch(`/api/doctor/${token}/extract`, { method: "POST", body }).catch(() => null);
    const json = (await res?.json().catch(() => null)) as (Extract & { message?: string }) | null;
    if (!res?.ok || !json) {
      setState("idle");
      return setError(json?.message ?? hr.doctor.upload.failed);
    }
    setData(json);
    setInstitutions(json.institutions);
    setForm({
      type: json.extracted.referral_type && TYPES.includes(json.extracted.referral_type) ? json.extracted.referral_type : "A1",
      specialty: json.specialtyCode ?? json.specialties[0]?.code ?? "",
      institution: json.institutionId ?? "",
      priority: json.extracted.priority ?? "redovna",
      note: json.extracted.note ?? "",
    });
    setState("review");
  }

  async function changeSpecialty(code: string) {
    setForm((f) => ({ ...f, specialty: code, institution: "" }));
    const res = await fetch(`/api/doctor/${token}/institutions?specialty=${code}`).catch(() => null);
    const json = (await res?.json().catch(() => null)) as { institutions?: Inst[] } | null;
    const list = json?.institutions ?? [];
    setInstitutions(list);
    setForm((f) => ({ ...f, institution: list[0]?.id ?? "" }));
  }

  async function send() {
    if (!fileRef.current || !form.institution) return setError(hr.doctor.upload.unknownInstitution);
    setState("sending");
    setError(null);
    const body = new FormData();
    body.append("file", fileRef.current);
    Object.entries(form).forEach(([k, v]) => body.append(k, v));
    const res = await fetch(`/api/doctor/${token}/issue`, { method: "POST", body }).catch(() => null);
    const json = (await res?.json().catch(() => null)) as { when?: string | null; message?: string } | null;
    if (!res?.ok) {
      setState("review");
      return setError(json?.message ?? hr.doctor.upload.failed);
    }
    setResult(json?.when ? hr.doctor.upload.sentAppointment(json.when) : hr.doctor.upload.sentNoSlot);
    setState("sent");
  }

  async function invite() {
    const res = await fetch(`/api/doctor/${token}/invite`, { method: "POST" }).catch(() => null);
    if (!res?.ok) return setError(hr.doctor.upload.failed);
    setState("invited");
  }

  if (state === "sent" || state === "invited") {
    return (
      <div className={`${ui.card} flex flex-col gap-2 border-2 border-success`} role="status">
        <p className="text-xl font-bold">{state === "sent" ? hr.doctor.upload.sent : hr.doctor.invited}</p>
        {result && <p className="text-lg">{result}</p>}
      </div>
    );
  }

  const select = `${ui.input} appearance-none`;
  return (
    <section className={`${ui.card} flex flex-col gap-4`} aria-labelledby="decide-title">
      <h2 id="decide-title" className="text-2xl font-bold">
        {state === "review" ? hr.doctor.upload.checkTitle : hr.doctor.upload.title}
      </h2>

      {state !== "review" && state !== "sending" && (
        <>
          <p className="text-lg text-muted-foreground">{hr.doctor.upload.body}</p>
          <label className={`${ui.btnPrimary} cursor-pointer`} aria-busy={state === "reading"}>
            <FileUp aria-hidden className="size-5" />
            {state === "reading" ? hr.doctor.upload.reading : hr.doctor.upload.choose}
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              className="sr-only"
              disabled={state === "reading"}
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
          </label>
          {state === "reading" && <div className={`${ui.skeleton} h-24`} aria-hidden />}
          <a href="/demo/uputnica-ana-orl.png" download className={`${ui.btnLink} self-start`}>
            <Download aria-hidden className="size-4" />
            {hr.doctor.upload.sample}
          </a>
        </>
      )}

      {(state === "review" || state === "sending") && data && (
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <p className="text-lg text-muted-foreground">{hr.doctor.upload.checkBody}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1">
              <span className={ui.label}>{hr.referral.type}</span>
              <select className={select} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className={ui.label}>{hr.referral.priority}</span>
              <select className={select} value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {hr.referral.priorities[p]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="grid gap-1">
            <span className={ui.label}>{hr.referral.specialty}</span>
            <select className={select} value={form.specialty} onChange={(e) => void changeSpecialty(e.target.value)}>
              {data.specialties.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className={ui.label}>{hr.referral.institution}</span>
            <select
              className={select}
              value={form.institution}
              onChange={(e) => setForm({ ...form, institution: e.target.value })}
              aria-describedby="inst-hint"
            >
              {!form.institution && <option value="">{hr.doctor.upload.pickInstitution}</option>}
              {institutions.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} — {i.city} ({i.distance_km.toFixed(1).replace(".", ",")} km)
                </option>
              ))}
            </select>
            {!data.institutionMatched && (
              <span id="inst-hint" className="text-base text-muted-foreground">
                {hr.doctor.upload.unknownInstitution}
              </span>
            )}
          </label>
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
            <button type="submit" className={`${ui.btnPrimary} flex-1`} disabled={state === "sending"} aria-busy={state === "sending"}>
              <Send aria-hidden className="size-5" />
              {state === "sending" ? hr.doctor.upload.sending : hr.doctor.upload.send}
            </button>
            <button type="button" className={ui.btnSecondary} onClick={() => setState("idle")} disabled={state === "sending"}>
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
        <button type="button" className={ui.btnSecondary} onClick={() => void invite()}>
          <UserCheck aria-hidden className="size-5" />
          {hr.doctor.invite}
        </button>
      )}
    </section>
  );
}
