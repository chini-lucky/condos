import { formatAppointment } from "./appointments";
import type { Offer } from "./repository";
import { getStation } from "../rail/network";
import { offerPosition, walkingMinutes } from "./location";
export function OfferMapOverlay({
  offers,
  scale,
  onOpen,
}: {
  offers: readonly Offer[];
  scale: number;
  onOpen: (offer: Offer) => void;
}) {
  return (
    <g aria-label="Positioned rental offers">
      {offers.map((offer) => {
        const position = offerPosition(offer);
        const station = offer.stationId ? getStation(offer.stationId) : null;
        if (!position || !station) return null;
        return (
          <g key={offer.id}>
            <line
              pointerEvents="none"
              opacity="0.5"
              x1={station.x}
              y1={station.y}
              x2={position.x}
              y2={position.y}
              stroke="#8b938c"
              strokeWidth={scale}
            />
            <g
              role="button"
              tabIndex={0}
              aria-label={`Open ${offer.name}`}
              data-offer={offer.id}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onOpen(offer);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onOpen(offer);
                }
              }}
            >
              <title>
                {offer.name} · {offer.walkingMetres} m · estimated{" "}
                {walkingMinutes(offer.walkingMetres)} min walk · {offer.status}
                {offer.status === "Pending" && offer.pendingExplanation
                  ? ` · ${offer.pendingExplanation}`
                  : ""}
                {offer.status === "Rejected" && offer.rejectionReason
                  ? ` · ${offer.rejectionReason}`
                  : ""}
                {offer.viewingAt
                  ? ` · ${formatAppointment(offer.viewingAt)}`
                  : ""}
              </title>
              <circle
                cx={position.x}
                cy={position.y}
                r={15 * scale}
                fill="transparent"
              />
              <circle
                cx={position.x}
                cy={position.y}
                r={6 * scale}
                fill="#161a17"
                stroke="white"
                strokeWidth={2 * scale}
              />
            </g>
          </g>
        );
      })}
    </g>
  );
}
