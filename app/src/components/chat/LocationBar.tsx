"use client";

import { LocateFixed, MapPin } from "lucide-react";
import { useState } from "react";
import { hr } from "@/i18n/hr";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";

// Smaller on phones so the chat stays visible; full size on large screens.
const compact =
  "min-h-11 rounded-xl px-4 text-base lg:min-h-14 lg:rounded-2xl lg:px-6 lg:text-lg";

export type ChatLocation =
  | { source: "gps"; lat: number; lng: number }
  | { source: "city"; city: string };

/** "Where are you now?" — GPS or a typed city. Optional; the agent can also ask. */
export function LocationBar({
  value,
  onChange,
  onSkip,
}: {
  value: ChatLocation | null;
  onChange: (v: ChatLocation | null) => void;
  /** "Preskoči": hide the question for the rest of this conversation. */
  onSkip?: () => void;
}) {
  const [mode, setMode] = useState<"ask" | "city" | "hidden">(
    value ? "hidden" : "ask",
  );
  const [city, setCity] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function useGps() {
    if (!("geolocation" in navigator)) {
      setMode("city");
      setError(hr.chat.location.denied);
      return;
    }
    setBusy(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        onChange({
          source: "gps",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setMode("hidden");
      },
      () => {
        setBusy(false);
        setMode("city");
        setError(hr.chat.location.denied);
      },
      { timeout: 10_000, maximumAge: 300_000 },
    );
  }

  if (value && mode === "hidden") {
    const where =
      value.source === "gps" ? hr.chat.location.gpsLabel : value.city;
    return (
      <p className="flex items-center gap-2 text-base text-muted-foreground">
        <MapPin aria-hidden className="size-5" />
        {hr.chat.location.set(where)}
        <button
          type="button"
          className={ui.btnLink}
          onClick={() => {
            onChange(null);
            setMode("ask");
          }}
        >
          {hr.chat.location.change}
        </button>
      </p>
    );
  }
  if (mode === "hidden") return null;

  return (
    <section
      className={cn(ui.card, "flex flex-col gap-2 p-4 lg:gap-3 lg:p-5")}
      aria-labelledby="loc-title"
    >
      <h2 id="loc-title" className="text-lg font-bold lg:text-xl">
        {hr.chat.location.title}
      </h2>
      <p className="text-sm text-muted-foreground lg:text-base">
        {hr.chat.location.body}
      </p>
      {mode === "ask" && (
        <button
          type="button"
          className={cn(ui.btnSecondary, compact)}
          onClick={useGps}
          disabled={busy}
          aria-busy={busy}
        >
          <LocateFixed aria-hidden className="size-5" />
          {busy ? hr.chat.location.locating : hr.chat.location.useGps}
        </button>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (city.trim().length < 2) return;
          onChange({ source: "city", city: city.trim() });
          setMode("hidden");
        }}
      >
        <label htmlFor="loc-city" className="sr-only">
          {hr.chat.location.cityLabel}
        </label>
        <input
          id="loc-city"
          className={cn(ui.input, compact, "min-w-0 flex-1 px-3 lg:px-4")}
          placeholder={
            mode === "ask"
              ? `${hr.chat.location.orType}: ${hr.chat.location.cityPlaceholder}`
              : hr.chat.location.cityPlaceholder
          }
          value={city}
          onChange={(e) => setCity(e.target.value)}
          autoComplete="address-level2"
        />
        <button
          type="submit"
          className={cn(ui.btnPrimary, compact)}
          disabled={city.trim().length < 2}
        >
          {hr.chat.location.confirm}
        </button>
      </form>
      {error && (
        <p role="alert" className="text-base font-medium text-urgent">
          {error}
        </p>
      )}
      <button
        type="button"
        className={cn(ui.btnLink, "min-h-10 self-start lg:min-h-12")}
        onClick={() => {
          setMode("hidden");
          onSkip?.();
        }}
      >
        {hr.chat.location.skip}
      </button>
    </section>
  );
}
