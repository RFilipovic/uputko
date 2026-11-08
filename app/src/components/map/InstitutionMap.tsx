"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import { hr } from "@/i18n/hr";
import { cn } from "@/lib/utils";

export type MapPoint = {
  lat: number;
  lng: number;
  label: string;
  kind: "place" | "you" | "emergency";
};

const STYLE = "https://tiles.openfreemap.org/styles/liberty";
const CROATIA: [number, number] = [16.4, 44.6];
const COLORS = {
  place: "#0028AB",
  you: "#0A1633",
  emergency: "#C81E1E",
} as const;

/**
 * Small map (MapLibre + OpenFreeMap, no API key). Flies to the first point.
 * Decorative support only: every place is also listed in text next to it.
 */
export function InstitutionMap({
  points,
  className,
  flyFromCountry = false,
}: {
  points: MapPoint[];
  className?: string;
  /** Start zoomed out over Croatia and fly to the place (the "it arrived" moment). */
  flyFromCountry?: boolean;
}) {
  const el = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  // MapLibre is large: load it only once the map is (nearly) on screen.
  const [visible, setVisible] = useState(false);
  const key = points.map((p) => `${p.lat},${p.lng},${p.kind}`).join("|");

  useEffect(() => {
    const node = el.current;
    if (!node || visible) return;
    if (!("IntersectionObserver" in window)) return setVisible(true);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || !el.current || points.length === 0) return;
    let map: import("maplibre-gl").Map | null = null;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      try {
        const maplibre = await import("maplibre-gl");
        if (cancelled || !el.current) return;
        maplibre.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
        const reduce = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;
        const first = points[0];
        const fromCountry = flyFromCountry && !reduce;
        const m = new maplibre.Map({
          container: el.current,
          style: STYLE,
          center: fromCountry ? CROATIA : [first.lng, first.lat],
          zoom: fromCountry ? 5.6 : points.length > 1 ? 11 : 13,
          attributionControl: { compact: true },
          cooperativeGestures: true,
        });
        map = m;
        // Individual tile/glyph errors are normal; only give up if nothing loads.
        timer = setTimeout(
          () => setState((s) => (s === "loading" ? "error" : s)),
          12_000,
        );
        m.on("load", () => {
          setState("ready");
          for (const p of points) {
            const dot = document.createElement("div");
            dot.style.cssText = `width:22px;height:22px;border-radius:999px;border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);background:${COLORS[p.kind]}`;
            dot.setAttribute("aria-hidden", "true");
            new maplibre.Marker({ element: dot })
              .setLngLat([p.lng, p.lat])
              .addTo(m);
          }
          if (points.length > 1) {
            const b = new maplibre.LngLatBounds();
            points.forEach((p) => b.extend([p.lng, p.lat]));
            m.fitBounds(b, {
              padding: 50,
              maxZoom: 14,
              duration: reduce ? 0 : 900,
            });
          } else {
            m.flyTo({
              center: [first.lng, first.lat],
              zoom: 14,
              duration: reduce ? 0 : fromCountry ? 2600 : 900,
              essential: false,
            });
          }
        });
      } catch {
        setState("error");
      }
    })();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      map?.remove();
    };
    // reason: points are compared by their coordinate key
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, visible]);

  if (points.length === 0) return null;
  return (
    <div
      className={cn(
        "relative h-52 overflow-hidden rounded-2xl border border-border bg-muted",
        className,
      )}
    >
      <div
        ref={el}
        className="h-full w-full"
        aria-label={points.map((p) => p.label).join(", ")}
        role="img"
      />
      {state === "loading" && (
        <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />
      )}
      {state === "error" && (
        <p className="absolute inset-0 grid place-items-center p-4 text-center text-base text-muted-foreground">
          {hr.map.unavailable}
        </p>
      )}
    </div>
  );
}
