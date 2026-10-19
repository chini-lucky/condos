import { formatAppointment } from "./appointments";
import type { Offer } from "./repository";
export function offerStatusContext(offer: Offer) {
  const explanation =
    offer.status === "Pending"
      ? offer.pendingExplanation
      : offer.status === "Rejected"
        ? offer.rejectionReason
        : null;
  return [
    ...(explanation ? [{ text: explanation, appointment: false }] : []),
    ...(offer.viewingAt || offer.status === "Viewing"
      ? [
          {
            text: offer.viewingAt
              ? formatAppointment(offer.viewingAt)
              : "Viewing time not arranged",
            appointment: true,
          },
        ]
      : []),
  ];
}
export function OfferStatusContext({
  offer,
  concise = false,
}: {
  offer: Offer;
  concise?: boolean;
}) {
  const context = offerStatusContext(offer);
  if (!context.length) return null;
  return (
    <div
      className={
        concise ? "offer-status-context concise" : "offer-status-context"
      }
    >
      {context.map(({ text, appointment }) => {
        const normalized = concise ? text.replace(/\s+/g, " ") : text;
        const visible =
          concise && normalized.length > 48
            ? `${normalized.slice(0, 48)}…`
            : normalized;
        return (
          <p
            key={appointment ? "viewing" : "explanation"}
            className={!concise && appointment ? "viewing-box" : undefined}
          >
            {visible}
          </p>
        );
      })}
    </div>
  );
}
