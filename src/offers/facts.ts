export const facilityNames = ["washer", "garden", "pool", "microwave"] as const;
export type FacilityName = (typeof facilityNames)[number];
export type PropertyType = "condominium" | "townhouse";
export interface OfferFacts {
  rent: number | null;
  propertyType: PropertyType | null;
  sizeSqm: number | null;
  beds: number | null;
  floor: number | null;
  washer: boolean | null;
  garden: boolean | null;
  pool: boolean | null;
  microwave: boolean | null;
  extraFacilities: string[];
}
export interface FactsDraft {
  rent: string;
  propertyType: "" | PropertyType;
  sizeSqm: string;
  beds: string;
  floor: string;
  washer: boolean | null;
  garden: boolean | null;
  pool: boolean | null;
  microwave: boolean | null;
  extraFacilities: string[];
}
export function factsDraft(offer: OfferFacts | null): FactsDraft {
  return {
    rent: offer?.rent?.toString() ?? "",
    propertyType: offer?.propertyType ?? "",
    sizeSqm: offer?.sizeSqm?.toString() ?? "",
    beds: offer?.beds?.toString() ?? "",
    floor: offer?.floor?.toString() ?? "",
    washer: offer?.washer ?? null,
    garden: offer?.garden ?? null,
    pool: offer?.pool ?? null,
    microwave: offer?.microwave ?? null,
    extraFacilities: offer?.extraFacilities ?? [],
  };
}
export function parseFacts(draft: FactsDraft): OfferFacts {
  function number(
    value: string,
    label: string,
    positive: boolean,
    integer: boolean,
  ) {
    if (!value.trim()) return null;
    const parsed = Number(value);
    if (
      !Number.isFinite(parsed) ||
      (positive && parsed <= 0) ||
      (integer && !Number.isInteger(parsed))
    )
      throw new Error(`Enter a valid ${label}.`);
    return parsed;
  }
  const beds = number(draft.beds, "number of beds", false, true);
  if (beds !== null && beds < 0) throw new Error("Beds must be zero or more.");
  return {
    ...draft,
    rent: number(draft.rent, "monthly rent", true, false),
    sizeSqm: number(draft.sizeSqm, "size", true, false),
    beds,
    floor: number(draft.floor, "floor", false, true),
    propertyType: draft.propertyType || null,
  };
}
