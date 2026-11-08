"use client";

import { BellRing } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { formatWhen } from "@/lib/format";
import { hr } from "@/i18n/hr";
import { ui } from "@/lib/ui";

type Offer = { id: string; kind: string; payload: Record<string, unknown> };

/**
 * Actionable offer that slides up like a phone notification: an earlier slot
 * freed up, or the institution proposes a new one. Prihvati / Odbij.
 */
export function OfferCard({
  offer,
  onChanged,
}: {
  offer: Offer;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const when =
    typeof offer.payload.starts_at === "string"
      ? formatWhen(offer.payload.starts_at)
      : "";
  const place = String(offer.payload.institution_name ?? "");
  const earlier = offer.kind === "earlier_slot_offer";

  async function answer(action: "accept" | "decline") {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/notifications/${offer.id}/${action}`, {
      method: "POST",
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) {
      const j = (await res?.json().catch(() => null)) as {
        message?: string;
      } | null;
      setError(j?.message ?? hr.appointment.error);
    }
    onChanged();
  }

  return (
    <motion.section
      layout
      role="status"
      aria-labelledby={`offer-${offer.id}`}
      className="pointer-events-auto flex w-full max-w-lg flex-col gap-3 rounded-3xl border-2 border-primary bg-card p-5 shadow-2xl"
      initial={{ opacity: 0, y: 80 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 80, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 300, damping: 26 }}
    >
      <h2
        id={`offer-${offer.id}`}
        className="flex items-center gap-2 text-xl font-bold"
      >
        <BellRing aria-hidden className="size-6 text-primary" />
        {earlier
          ? hr.notifications.earlierTitle
          : hr.notifications.rescheduleTitle}
      </h2>
      <p className="text-lg">
        {earlier
          ? hr.notifications.earlierBody(when, place)
          : hr.notifications.rescheduleBody(when, place)}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          className={`${ui.btnPrimary} flex-1`}
          onClick={() => answer("accept")}
          disabled={busy}
        >
          {hr.notifications.accept}
        </button>
        <button
          type="button"
          className={`${ui.btnSecondary} flex-1`}
          onClick={() => answer("decline")}
          disabled={busy}
        >
          {hr.notifications.decline}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-base font-medium text-urgent">
          {error}
        </p>
      )}
    </motion.section>
  );
}
