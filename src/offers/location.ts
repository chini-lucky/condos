import { getStation } from "../rail/network.ts";
export interface OfferLocation {
  stationId: string | null;
  walkingMetres: number | null;
  bearing: number | null;
}
export interface LocationDraft {
  stationId: string;
  walkingMetres: string;
  bearing: string;
}
export function locationDraft(
  offer: OfferLocation | null,
  initialStationId?: string,
): LocationDraft {
  return {
    stationId: offer ? (offer.stationId ?? "") : (initialStationId ?? ""),
    walkingMetres: offer?.walkingMetres?.toString() ?? "",
    bearing: offer?.bearing?.toString() ?? "",
  };
}
export function parseLocation(draft: LocationDraft): OfferLocation {
  const walkingMetres =
    draft.walkingMetres.trim() === "" ? null : Number(draft.walkingMetres);
  const bearing = draft.bearing.trim() === "" ? null : Number(draft.bearing);
  if (draft.stationId && !getStation(draft.stationId))
    throw new Error("Choose a station from the rail map.");
  if (
    walkingMetres !== null &&
    (!Number.isFinite(walkingMetres) || walkingMetres < 0)
  )
    throw new Error("Walking distance must be zero or more metres.");
  if (
    bearing !== null &&
    (!Number.isFinite(bearing) || bearing < 0 || bearing >= 360)
  )
    throw new Error(
      "Direction must be from 0 up to, but not including, 360 degrees.",
    );
  return { stationId: draft.stationId || null, walkingMetres, bearing };
}
export interface LocatedOffer extends OfferLocation {
  rent?: number | null;
}
export function walkingMinutes(metres: number | null): number | null {
  return metres === null ? null : Math.round(metres / 80);
}
export function offerPosition(
  offer: OfferLocation,
): { x: number; y: number } | null {
  const station = offer.stationId ? getStation(offer.stationId) : null;
  if (!station || offer.walkingMetres === null || offer.bearing === null)
    return null;
  const distance = (offer.walkingMetres / 1000) * 27;
  const radians = (offer.bearing * Math.PI) / 180;
  return {
    x: station.x + Math.sin(radians) * distance,
    y: station.y - Math.cos(radians) * distance,
  };
}
export function offersByDistance<T extends OfferLocation>(
  offers: readonly T[],
): T[] {
  return [...offers].sort(
    (a, b) => (a.walkingMetres ?? Infinity) - (b.walkingMetres ?? Infinity),
  );
}
export function stationSummaries(
  offers: readonly LocatedOffer[],
): { stationId: string; count: number; lowestRent: number | null }[] {
  const summaries = new Map<
    string,
    { stationId: string; count: number; lowestRent: number | null }
  >();
  for (const offer of offers) {
    if (!offer.stationId || !getStation(offer.stationId)) continue;
    const summary = summaries.get(offer.stationId) ?? {
      stationId: offer.stationId,
      count: 0,
      lowestRent: null,
    };
    summary.count++;
    if (offer.rent != null)
      summary.lowestRent =
        summary.lowestRent === null
          ? offer.rent
          : Math.min(summary.lowestRent, offer.rent);
    summaries.set(offer.stationId, summary);
  }
  return [...summaries.values()];
}
export function nearestStationWithOffers(
  stationId: string,
  offers: readonly OfferLocation[],
) {
  const origin = getStation(stationId);
  if (!origin) return null;
  const candidates = new Set(
    offers.flatMap((offer) =>
      offer.stationId && offer.stationId !== stationId ? [offer.stationId] : [],
    ),
  );
  const stations = [...candidates].flatMap((id) => {
    const station = getStation(id);
    return station ? [station] : [];
  });
  stations.sort(
    (a, b) =>
      Math.hypot(a.x - origin.x, a.y - origin.y) -
      Math.hypot(b.x - origin.x, b.y - origin.y),
  );
  return stations[0] ?? null;
}
