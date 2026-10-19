import { OfferCover } from "../photos/OfferPhotos";
import { FilteredOfferList } from "./FilteredOfferList";
import {
  classifyOffer,
  defaultFilters,
  filtersActive,
  type OfferFilters,
} from "./filters";
import { OfferStatusDisplay } from "./OfferStatusDisplay";
import type { Station } from "../rail/network";
import { OfferFactsSummary } from "./OfferFactsSummary";
import type { Offer } from "./repository";
import {
  nearestStationWithOffers,
  offersByDistance,
  walkingMinutes,
} from "./location";
import type { LocatedOffer } from "./location";
export function walkingDescription(offer: LocatedOffer): string {
  const minutes = walkingMinutes(offer.walkingMetres);
  return offer.walkingMetres === null
    ? "Walking distance unknown"
    : `${offer.walkingMetres.toLocaleString("en-GB")} m · estimated ${minutes} min walk`;
}
export function rentDescription(offer: LocatedOffer): string {
  return offer.rent == null
    ? "Rent not recorded"
    : `฿${offer.rent.toLocaleString("en-GB")} / month`;
}
export function StationOfferList({
  station,
  offers,
  onAdd,
  onSelectStation,
  filters = defaultFilters(),
  highlightedOfferId,
  onHighlight,
}: {
  station: Station;
  offers: readonly Offer[];
  filters?: OfferFilters;
  highlightedOfferId?: string | null;
  onHighlight?: (id: string | null) => void;
  onAdd: () => void;
  onSelectStation: (station: Station) => void;
}) {
  const assigned = offersByDistance(
    offers.filter((offer) => offer.stationId === station.id),
  );
  const matching = assigned.filter(
    (offer) => classifyOffer(offer, filters).kind === "match",
  );
  const nearest = nearestStationWithOffers(station.id, offers);
  return (
    <section aria-label={`Offers near ${station.name}`}>
      <p>
        {filtersActive(filters)
          ? `${matching.length} of ${assigned.length} matching`
          : `${assigned.length} ${assigned.length === 1 ? "offer" : "offers"}`}
      </p>
      <button onClick={onAdd}>Add offer</button>
      {assigned.length === 0 ? (
        <div className="rail-empty">
          <p>Nothing on file here yet.</p>
          {nearest && (
            <button onClick={() => onSelectStation(nearest)}>
              Nearest with offers: {nearest.name}
            </button>
          )}
        </div>
      ) : (
        <FilteredOfferList
          offers={assigned}
          filters={filters}
          className="station-offer-list"
          highlightedOfferId={highlightedOfferId}
          onHighlight={onHighlight}
          renderOffer={(offer) => (
            <>
              <OfferCover offerId={offer.id} name={offer.name} />
              <a href={`#offer=${offer.id}`}>{offer.name}</a>
              <p>{walkingDescription(offer)}</p>
              <OfferFactsSummary offer={offer} />
              <OfferStatusDisplay offer={offer} />
            </>
          )}
        />
      )}
    </section>
  );
}
