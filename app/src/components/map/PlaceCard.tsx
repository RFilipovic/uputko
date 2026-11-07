import { MapPin, Navigation, Phone } from "lucide-react";
import { OpenBadge } from "@/components/map/OpenBadge";
import { SourceChip } from "@/components/data/SourceChip";
import { formatKm } from "@/lib/geo/distance";
import { directionsUrl } from "@/lib/format";
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
  /** Closed now: when it opens next ("sutra u 7:00"). */
  next_open?: string | null;
};

/** One place: name, address, distance, open status, directions + call. */
export function PlaceCard({
  place,
  emergency = false,
  highlight = false,
}: {
  place: PlaceLike;
  emergency?: boolean;
  highlight?: boolean;
}) {
  return (
    <article
      className={cn(
        ui.card,
        "flex flex-col gap-3",
        highlight && "border-2 border-primary",
      )}
    >
      <div>
        <h3 className="text-xl leading-snug font-bold">{place.name}</h3>
        <p className="mt-1 flex items-start gap-2 text-lg text-foreground/85">
          <MapPin aria-hidden className="mt-1 size-5 shrink-0" />
          <span>
            {[place.address, place.city].filter(Boolean).join(", ")}
            {place.distance_km != null && (
              <span className="block text-base text-muted-foreground">
                {hr.direct.distance(formatKm(place.distance_km))}
              </span>
            )}
          </span>
        </p>
      </div>
      <OpenBadge info={place} emergency={emergency} />
      {place.next_open && !emergency && (
        <p className="text-lg font-semibold">
          {hr.direct.opensNext(place.next_open)}
        </p>
      )}
      {place.geo_precision &&
        ["postcode", "city"].includes(place.geo_precision) && (
          <p className="text-sm text-muted-foreground">{hr.direct.approx}</p>
        )}
      <div className="flex flex-col gap-2 sm:flex-row">
        <a
          className={cn(emergency ? ui.btnSecondary : ui.btnPrimary, "flex-1")}
          href={directionsUrl(place.lat, place.lng)}
          target="_blank"
          rel="noreferrer"
        >
          <Navigation aria-hidden className="size-5" />
          {hr.direct.directions}
        </a>
        {/* In an emergency the only number to call is 112. */}
        {place.phone && !emergency && (
          <a
            className={cn(ui.btnSecondary, "flex-1")}
            href={`tel:${place.phone.replace(/[^\d+]/g, "")}`}
          >
            <Phone aria-hidden className="size-5" />
            {hr.direct.call}
          </a>
        )}
      </div>
      <SourceChip dataset={place.source_dataset} />
    </article>
  );
}
