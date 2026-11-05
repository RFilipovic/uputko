"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { hr } from "@/i18n/hr";
import { ui } from "@/lib/ui";

/** Demo institution actions for one booking. No Claude calls; synthetic slots only. */
export function BookingActions({
  appointmentId,
  canFree,
  slots,
}: {
  appointmentId: string;
  canFree: boolean;
  slots: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function post(path: string, body: Record<string, string>, okText: string) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/institution/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).catch(() => null);
    const j = (await res?.json().catch(() => null)) as { message?: string } | null;
    setBusy(false);
    setMsg(res?.ok ? { ok: true, text: okText } : { ok: false, text: j?.message ?? hr.institution.error });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {canFree && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            className={ui.btnPrimary}
            disabled={busy}
            onClick={() => post("free-earlier", { appointmentId }, hr.institution.freed)}
          >
            {hr.institution.free}
          </button>
          <p className="text-sm text-muted-foreground">{hr.institution.freeHint}</p>
        </div>
      )}
      {slots.length > 0 && (
        <ul className="flex flex-col gap-2">
          {slots.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className={`${ui.btnSecondary} w-full justify-between`}
                disabled={busy}
                onClick={() => post("offer", { appointmentId, slotId: s.id }, hr.institution.offered)}
              >
                <span>{s.label}</span>
                <span className="text-primary">{hr.institution.offer}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {msg && (
        <p role="status" className={msg.ok ? "text-base font-medium text-success" : "text-base font-medium text-urgent"}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
