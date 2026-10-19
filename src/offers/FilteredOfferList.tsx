import type { ReactNode } from "react";
import type { Offer } from "./repository";
import {
  classifyOffer,
  filtersActive,
  type OfferFilters,
  type OfferMatch,
} from "./filters";
export function FilteredOfferList({
  offers,
  filters,
  renderOffer,
  className,
  highlightedOfferId,
  onHighlight,
}: {
  offers: readonly Offer[];
  filters: OfferFilters;
  renderOffer: (offer: Offer) => ReactNode;
  className: string;
  highlightedOfferId?: string | null;
  onHighlight?: (id: string | null) => void;
}) {
  const matches = offers.filter(
    (offer) => classifyOffer(offer, filters).kind === "match",
  );
  const missing = offers.flatMap((offer) => {
    const match = classifyOffer(offer, filters);
    return match.kind === "missing-facility" ? [{ offer, match }] : [];
  });
  function row(
    offer: Offer,
    match?: Extract<OfferMatch, { kind: "missing-facility" }>,
  ) {
    return (
      <li
        key={offer.id}
        data-offer-card={offer.id}
        className={
          highlightedOfferId === offer.id ? "is-highlighted" : undefined
        }
        onMouseEnter={() => onHighlight?.(offer.id)}
        onMouseLeave={() => onHighlight?.(null)}
        onFocus={() => onHighlight?.(offer.id)}
        onBlur={() => onHighlight?.(null)}
      >
        {renderOffer(offer)}
        {match && (
          <p className="facility-reason">
            {match.missing
              .map(({ facility, state }) =>
                state === "unknown"
                  ? `${facility.charAt(0).toUpperCase() + facility.slice(1)} unknown`
                  : `No ${facility}`,
              )
              .join(" · ")}
          </p>
        )}
      </li>
    );
  }
  return (
    <>
      {matches.length > 0 ? (
        <ul className={className}>{matches.map((offer) => row(offer))}</ul>
      ) : filtersActive(filters) ? (
        <p role="status">No offers match these filters.</p>
      ) : null}
      {missing.length > 0 && (
        <section
          className="missing-facility-group"
          aria-label="Missing a facility"
        >
          <h3>Missing a facility</h3>
          <ul className={className}>
            {missing.map(({ offer, match }) => row(offer, match))}
          </ul>
        </section>
      )}
    </>
  );
}
