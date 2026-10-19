import type { Offer } from "./repository";
import { formatAppointment } from "./appointments";
export function OfferStatusDisplay({
  offer,
  compact = false,
}: {
  offer: Offer;
  compact?: boolean;
}) {
  return (
    <div className="offer-status-display">
      <span
        className={`offer-status-label offer-status-${offer.status.toLowerCase()}`}
      >
        {offer.status}
      </span>
      {!compact && (
        <>
          {offer.status === "Pending" && offer.pendingExplanation && (
            <p>{offer.pendingExplanation}</p>
          )}
          {offer.status === "Rejected" && offer.rejectionReason && (
            <p>{offer.rejectionReason}</p>
          )}
          <p>
            {offer.viewingAt
              ? formatAppointment(offer.viewingAt)
              : "Viewing time not arranged"}
          </p>
        </>
      )}
    </div>
  );
}
