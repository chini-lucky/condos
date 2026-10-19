import type { Offer } from "./repository";
import { OfferStatusContext } from "./OfferStatusContext";
export function OfferStatusDisplay({
  offer,
  compact = false,
  detailsOnly = false,
}: {
  offer: Offer;
  compact?: boolean;
  detailsOnly?: boolean;
}) {
  return (
    <div className="offer-status-display">
      {!detailsOnly && (
        <span
          className={`offer-status-label offer-status-${offer.status.toLowerCase()}`}
        >
          {offer.status}
        </span>
      )}
      {!compact && <OfferStatusContext offer={offer} />}
    </div>
  );
}
