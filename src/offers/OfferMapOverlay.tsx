import { OfferStatusContext, offerStatusContext } from "./OfferStatusContext";
import { formatAppointment } from "./appointments";
import type { Offer } from "./repository";
import { getStation } from "../rail/network";
import { offerPosition, walkingMinutes } from "./location";
import { pinVisibility, placeCallouts } from "../rail/mapNavigation";
import type { MapView } from "../rail/mapNavigation";
import { OfferStatusDisplay } from "./OfferStatusDisplay";
import { OfferPrice, FacilityIndicators } from "./OfferFactsSummary";
export function OfferMapOverlay({
  offers,
  view,
  onOpen,
  highlightedOfferId,
  selectedOfferId,
  onHighlight,
  opacityByOffer,
}: {
  offers: readonly Offer[];
  view: MapView;
  onOpen: (offer: Offer) => void;
  highlightedOfferId: string | null;
  selectedOfferId: string | null;
  onHighlight: (id: string | null) => void;
  opacityByOffer?: ReadonlyMap<string, { pin: number; callout: number }>;
}) {
  const { scale, viewport } = view;
  const opacity = pinVisibility(view.zoom);
  const focusId = view.focusedStationId ?? view.nearestStationId;
  const positioned = offers.flatMap((offer) => {
    const position = offerPosition(offer);
    return position ? [{ offer, position }] : [];
  });
  const stationIds = new Set(
    offers.flatMap((offer) => (offer.stationId ? [offer.stationId] : [])),
  );
  const calloutOffers = positioned.filter(
    (item) => item.offer.stationId === focusId,
  );
  // Each concise context paragraph has room for up to four wrapped lines.
  const contextRows = Math.max(
    0,
    ...calloutOffers.map(({ offer }) => offerStatusContext(offer).length),
  );
  const box = {
    width: Math.min(184, view.size.width - 24),
    height: 88 + 56 * contextRows,
  };
  const callouts =
    27 / scale >= 100 && opacity > 0
      ? placeCallouts(
          calloutOffers.map((item) => ({
            id: item.offer.id,
            x: (item.position.x - viewport.x) / scale,
            y: (item.position.y - viewport.y) / scale,
          })),
          view.size,
          [
            ...view.blocked,
            ...positioned.map((item) => ({
              x: (item.position.x - viewport.x) / scale - 17,
              y: (item.position.y - viewport.y) / scale - 17,
              width: 34,
              height: 34,
            })),
          ],
          box,
        )
      : [];
  return (
    <g aria-label="Rental offers and walking rings">
      <g
        aria-label="Estimated walking rings"
        opacity={opacity}
        pointerEvents="none"
      >
        {[...stationIds].map((id) => {
          const station = getStation(id);
          if (!station) return null;
          const focused = id === focusId;
          return (
            <g key={id} opacity={focused ? 1 : 0.16}>
              {[400, 800, 1200].map((metres) => (
                <g key={metres}>
                  <circle
                    cx={station.x}
                    cy={station.y}
                    r={(metres / 1000) * 27}
                    fill="none"
                    stroke="#8b938c"
                    strokeWidth={scale}
                    strokeDasharray={
                      metres === 400 ? undefined : `${3 * scale} ${4 * scale}`
                    }
                  />
                  {focused && (
                    <text
                      x={station.x}
                      y={station.y - (metres / 1000) * 27 - 4 * scale}
                      textAnchor="middle"
                      fontSize={11 * scale}
                      strokeWidth={3 * scale}
                      className="walking-ring-label"
                    >
                      {metres / 80} min · {metres} m
                    </text>
                  )}
                </g>
              ))}
            </g>
          );
        })}
      </g>
      <g
        opacity={opacity}
        style={{ pointerEvents: opacity === 0 ? "none" : undefined }}
      >
        {positioned.map(({ offer, position }) => {
          const station = offer.stationId ? getStation(offer.stationId) : null;
          if (!station) return null;
          const highlighted =
            offer.id === highlightedOfferId || offer.id === selectedOfferId;
          return (
            <g key={offer.id} opacity={opacityByOffer?.get(offer.id)?.pin ?? 1}>
              <line
                pointerEvents="none"
                opacity=".5"
                x1={station.x}
                y1={station.y}
                x2={position.x}
                y2={position.y}
                stroke="#8b938c"
                strokeWidth={scale}
              />
              <g
                role="button"
                tabIndex={opacity === 0 ? -1 : 0}
                aria-hidden={opacity === 0}
                aria-label={`Open ${offer.name}`}
                aria-pressed={highlighted}
                data-offer={offer.id}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onOpen(offer);
                }}
                onMouseEnter={() => onHighlight(offer.id)}
                onMouseLeave={() => onHighlight(null)}
                onFocus={() => onHighlight(offer.id)}
                onBlur={() => onHighlight(null)}
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
                  {walkingMinutes(offer.walkingMetres)} min walk ·{" "}
                  {offer.status}
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
                  r={17 * scale}
                  fill="transparent"
                />
                <circle
                  cx={position.x}
                  cy={position.y}
                  r={(highlighted ? 10 : 6) * scale}
                  fill="#161a17"
                  stroke="white"
                  strokeWidth={2 * scale}
                />
              </g>
            </g>
          );
        })}
      </g>
      {callouts.map((rect) => {
        const item = positioned.find((item) => item.offer.id === rect.id);
        if (!item) return null;
        const { offer, position } = item;
        const active =
          offer.id === highlightedOfferId || offer.id === selectedOfferId;
        return (
          <g
            key={offer.id}
            opacity={opacityByOffer?.get(offer.id)?.callout ?? 1}
            className={
              active ? "offer-map-callout is-highlighted" : "offer-map-callout"
            }
          >
            <line
              pointerEvents="none"
              x1={position.x}
              y1={position.y}
              x2={viewport.x + (rect.x + rect.width / 2) * scale}
              y2={viewport.y + (rect.y + rect.height / 2) * scale}
              stroke="#8b938c"
              strokeWidth={scale}
            />
            <foreignObject
              x={0}
              y={0}
              width={rect.width}
              height={rect.height}
              transform={`translate(${viewport.x + rect.x * scale} ${viewport.y + rect.y * scale}) scale(${scale})`}
            >
              <button
                className="offer-callout-button"
                aria-label={`Details for ${offer.name}`}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onOpen(offer)}
                onMouseEnter={() => onHighlight(offer.id)}
                onMouseLeave={() => onHighlight(null)}
                onFocus={() => onHighlight(offer.id)}
                onBlur={() => onHighlight(null)}
              >
                <strong>{offer.name}</strong>
                <span className="callout-distance">
                  {offer.walkingMetres} m · estimated{" "}
                  {walkingMinutes(offer.walkingMetres)} min
                </span>
                <OfferPrice rent={offer.rent} compact />
                <div className="callout-bottom">
                  <FacilityIndicators offer={offer} compact />
                  <OfferStatusDisplay offer={offer} compact />
                </div>
                <OfferStatusContext offer={offer} concise />
              </button>
            </foreignObject>
          </g>
        );
      })}
    </g>
  );
}
