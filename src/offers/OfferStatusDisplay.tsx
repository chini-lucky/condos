import type { Offer } from "./repository";
import { formatAppointment } from "./appointments";
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
      {!compact && (
        <>
          {offer.status === "Pending" && offer.pendingExplanation && (
            <p>{offer.pendingExplanation}</p>
          )}
          {offer.status === "Rejected" && offer.rejectionReason && (
            <p>{offer.rejectionReason}</p>
          )}
          {(offer.viewingAt || offer.status === "Viewing") && (
            <p className="viewing-box">
              {offer.viewingAt
                ? formatAppointment(offer.viewingAt)
                : "Viewing time not arranged"}
            </p>
          )}
        </>
      )}
    </div>
  );
}
