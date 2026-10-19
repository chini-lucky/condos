import type { FacilityName, OfferFacts, PropertyType } from "./facts";
export interface OfferFilters {
  facilities: readonly FacilityName[];
  types: readonly PropertyType[];
  rentLimit: number | null;
}
export type FilterableOffer = Pick<
  OfferFacts,
  "rent" | "propertyType" | FacilityName
> & { stationId: string | null };
export type OfferMatch =
  | { kind: "match" }
  | { kind: "excluded" }
  | {
      kind: "missing-facility";
      missing: { facility: FacilityName; state: "unknown" | "absent" }[];
    };
export function defaultFilters(): OfferFilters {
  return { facilities: [], types: [], rentLimit: null };
}
export function filtersActive(filters: OfferFilters): boolean {
  return (
    filters.facilities.length > 0 ||
    filters.types.length === 1 ||
    filters.rentLimit !== null
  );
}
export function classifyOffer(
  offer: FilterableOffer,
  filters: OfferFilters,
): OfferMatch {
  if (
    filters.types.length === 1 &&
    (offer.propertyType === null || !filters.types.includes(offer.propertyType))
  )
    return { kind: "excluded" };
  if (
    filters.rentLimit !== null &&
    (offer.rent === null || offer.rent > filters.rentLimit)
  )
    return { kind: "excluded" };
  const missing: Extract<OfferMatch, { kind: "missing-facility" }>["missing"] =
    [];
  for (const facility of filters.facilities) {
    if (offer[facility] !== true)
      missing.push({
        facility,
        state: offer[facility] === null ? "unknown" : "absent",
      });
  }
  return missing.length
    ? { kind: "missing-facility", missing }
    : { kind: "match" };
}
export function matchingStationSummaries(
  offers: readonly FilterableOffer[],
  filters: OfferFilters,
) {
  const stations = new Map<
    string,
    {
      stationId: string;
      count: number;
      total: number;
      lowestRent: number | null;
    }
  >();
  for (const offer of offers) {
    if (!offer.stationId) continue;
    const summary = stations.get(offer.stationId) ?? {
      stationId: offer.stationId,
      count: 0,
      total: 0,
      lowestRent: null,
    };
    summary.total++;
    if (classifyOffer(offer, filters).kind === "match") {
      summary.count++;
      if (offer.rent !== null)
        summary.lowestRent =
          summary.lowestRent === null
            ? offer.rent
            : Math.min(summary.lowestRent, offer.rent);
    }
    stations.set(offer.stationId, summary);
  }
  return [...stations.values()];
}
export function filterSummary(filters: OfferFilters): string {
  const descriptions: string[] = [];
  if (filters.facilities.length)
    descriptions.push(
      filters.facilities
        .map((name) => name.charAt(0).toUpperCase() + name.slice(1))
        .join(" + "),
    );
  if (filters.types.length === 1)
    descriptions.push(
      filters.types[0] === "condominium" ? "Condominium" : "Townhouse",
    );
  return `${descriptions.length ? descriptions.join(" · ") : "All offers"} · ${filters.rentLimit === null ? "Any rent" : `≤ ฿${filters.rentLimit.toLocaleString("en-GB")} / month`}`;
}
export function offerFilterOpacity(
  offer: FilterableOffer,
  filters: OfferFilters,
) {
  return classifyOffer(offer, filters).kind === "match"
    ? { pin: 1, callout: 1 }
    : { pin: 0.35, callout: 0.45 };
}
