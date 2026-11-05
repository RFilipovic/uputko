import { Clock, MapPin, Navigation, Phone } from "lucide-react";
import { formatKm } from "@/lib/geo/distance";
import { directionsUrl, hhmm } from "@/lib/format";
import { hr } from "@/i18n/hr";
import { ui } from "@/lib/ui";
import { cn } from "@/lib/utils";

export type PlaceLike = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  lat: number;
  lng: number;
  distance_km?: number;
  geo_precision?: string | null;
  open_now?: boolean | null;
  closes_at?: string | null;
  has_hours?: boolean | null;
  is_on_call?: boolean | null;
  source_dataset?: string;
};

/** One place: name, address, distance, open status, directions + call. */
export function PlaceCard({ place, emergency = false, highlight = false }: { place: PlaceLike; emergency?: boolean; highlight?: boolean }) {
  const open = place.open_now === true;
  const status = emergency
    ? hr.emergency.open24
    : place.has_hours === false || place.open_now == null
      ? hr.direct.hoursUnknown
      : open
        ? place.closes_at && place.closes_at < "24"
          ? hr.direct.openUntil(hhmm(place.closes_at))
          : hr.direct.openNow
        : hr.direct.closedNow;
  return (
    <article className={cn(ui.card, "flex flex-col gap-3", highlight && "border-2 border-primary")}>
      <div>
        <h3 className="text-xl leading-snug font-bold">{place.name}</h3>
        <p className="mt-1 flex items-start gap-2 text-lg text-foreground/85">
          <MapPin aria-hidden className="mt-1 size-5 shrink-0" />
          <span>
            {[place.address, place.city].filter(Boolean).join(", ")}
            {place.distance_km != null && (
              <span className="block text-base text-muted-foreground">{hr.direct.distance(formatKm(place.distance_km))}</span>
            )}
          </span>
        </p>
      </div>
      <p
        className={cn(
          "inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-base font-semibold",
          emergency ? "bg-urgent/10 text-urgent" : open ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
        )}
      >
        <Clock aria-hidden className="size-4" />
        {status}
      </p>
      {place.geo_precision && ["postcode", "city"].includes(place.geo_precision) && (
        <p className="text-sm text-muted-foreground">{hr.direct.approx}</p>
      )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <a className={cn(emergency ? ui.btnSecondary : ui.btnPrimary, "flex-1")} href={directionsUrl(place.lat, place.lng)} target="_blank" rel="noreferrer">
          <Navigation aria-hidden className="size-5" />
          {hr.direct.directions}
        </a>
        {place.phone && (
          <a className={cn(ui.btnSecondary, "flex-1")} href={`tel:${place.phone.replace(/[^\d+]/g, "")}`}>
            <Phone aria-hidden className="size-5" />
            {hr.direct.call}
          </a>
        )}
      </div>
      {place.source_dataset && <p className="text-xs text-muted-foreground">{hr.sources.label(place.source_dataset)}</p>}
    </article>
  );
}
