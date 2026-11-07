import { PlaceCard, type PlaceLike } from "@/components/map/PlaceCard";
import { hr } from "@/i18n/hr";

/** Nothing open right now: the nearest emergency department (0–24) for "can't wait". */
export function OnCallCard({ place }: { place: PlaceLike }) {
  return (
    <section aria-labelledby="oncall-title" className="flex flex-col gap-2">
      <h3 id="oncall-title" className="text-xl font-bold">
        {hr.direct.onCallTitle}
      </h3>
      <p className="text-lg">{hr.direct.onCallBody}</p>
      <PlaceCard place={place} emergency />
    </section>
  );
}
