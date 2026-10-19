import type { Station } from "../rail/network";
import { getStation } from "../rail/network";
import { LineBadges } from "../rail/RailBrowser";
import type { Offer } from "./repository";
import {
  classifyOffer,
  filterSummary,
  filtersActive,
  matchingStationSummaries,
  type OfferFilters,
} from "./filters";
import { FilteredOfferList } from "./FilteredOfferList";
import { OfferCard } from "./OfferCard";
export function OffersOverview({
  offers,
  filters,
  onStation,
  onAdd,
  highlightedOfferId,
  onHighlight,
}: {
  offers: readonly Offer[];
  filters: OfferFilters;
  onStation: (station: Station) => void;
  onAdd: () => void;
  highlightedOfferId: string | null;
  onHighlight: (id: string | null) => void;
}) {
  const summaries = matchingStationSummaries(offers, filters).sort(
    (a, b) => b.count - a.count || b.total - a.total,
  );
  const unassigned = offers.filter((offer) => offer.stationId === null);
  const matches = offers.filter(
    (offer) => classifyOffer(offer, filters).kind === "match",
  );
  const stations = summaries.filter((summary) => summary.count > 0).length;
  return (
    <div className="offers-overview">
      <h2 className="overview-total">
        {matches.length} {matches.length === 1 ? "offer" : "offers"} ·{" "}
        {stations} {stations === 1 ? "station" : "stations"}
      </h2>
      {filtersActive(filters) && (
        <p className="overview-filter-blurb">{filterSummary(filters)}</p>
      )}
      {summaries.length > 0 && (
        <section aria-label="Stations with offers">
          <h3 className="sr-only">Stations with offers</h3>
          <ul className="station-summary-list">
            {summaries.map((summary) => {
              const station = getStation(summary.stationId);
              return (
                station && (
                  <li key={station.id}>
                    <button
                      data-zero-matches={summary.count === 0}
                      aria-label={`Browse ${station.name}`}
                      onClick={() => onStation(station)}
                    >
                      <LineBadges station={station} />
                      <strong>{station.name}</strong>
                      <span>
                        {filtersActive(filters)
                          ? `${summary.count} of ${summary.total} matching`
                          : `${summary.count} ${summary.count === 1 ? "offer" : "offers"}`}
                        {summary.lowestRent === null
                          ? ""
                          : ` · from ฿${summary.lowestRent.toLocaleString("en-GB")}`}
                      </span>
                    </button>
                  </li>
                )
              );
            })}
          </ul>
        </section>
      )}
      <section className="unassigned-section">
        <div className="section-heading">
          <h2>Unassigned</h2>
          <button className="button secondary" onClick={onAdd}>
            Add offer
          </button>
        </div>
        {unassigned.length === 0 ? (
          <p className="muted">
            {offers.length === 0
              ? "No offers yet. Add your first rental offer."
              : "No unassigned offers."}
          </p>
        ) : (
          <FilteredOfferList
            offers={unassigned}
            filters={filters}
            className="offer-list"
            highlightedOfferId={highlightedOfferId}
            onHighlight={onHighlight}
            renderOffer={(offer) => <OfferCard offer={offer} />}
          />
        )}
      </section>
    </div>
  );
}
