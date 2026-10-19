import { facilityNames, type OfferFacts } from "./facts";
import { FilterIcon } from "./FilterIcon";
export function OfferPrice({
  rent,
  compact = false,
}: {
  rent: number | null;
  compact?: boolean;
}) {
  return (
    <p className={compact ? "offer-price compact" : "offer-price"}>
      {rent === null ? "Rent not recorded" : `฿${rent.toLocaleString("en-GB")}`}
      {rent !== null && <small>{compact ? " /mo" : " / month"}</small>}
    </p>
  );
}
export function PropertyLabel({ type }: { type: OfferFacts["propertyType"] }) {
  return (
    <span className="property-label">
      {type && <FilterIcon name={type} />}{" "}
      {type === null
        ? "Type unknown"
        : type === "condominium"
          ? "Condominium"
          : "Townhouse"}
    </span>
  );
}
export function FacilityIndicators({
  offer,
  compact = false,
}: {
  offer: OfferFacts;
  compact?: boolean;
}) {
  return (
    <ul className={compact ? "facility-indicators" : "facility-grid"}>
      {facilityNames.map((name) => {
        const label = name.charAt(0).toUpperCase() + name.slice(1),
          state =
            offer[name] === null
              ? "Unknown"
              : offer[name]
                ? "Present"
                : "Absent";
        return (
          <li
            key={name}
            className={`facility-${state.toLowerCase()}`}
            aria-label={`${label}: ${state}`}
            title={`${label}: ${state}`}
          >
            <FilterIcon name={name} />
            {!compact && <b>{label}</b>}
            <span className="facility-mark" aria-hidden="true">
              {offer[name] === null ? "?" : offer[name] ? "✓" : "○"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
export function OfferSpecs({ offer }: { offer: OfferFacts }) {
  return (
    <dl className="offer-specs">
      <div>
        <dt>Size</dt>
        <dd>{offer.sizeSqm === null ? "Unknown" : `${offer.sizeSqm} m²`}</dd>
      </div>
      <div>
        <dt>Beds</dt>
        <dd>
          {offer.beds === null
            ? "Unknown"
            : offer.beds === 0
              ? "Studio (0 beds)"
              : `${offer.beds} bed${offer.beds === 1 ? "" : "s"}`}
        </dd>
      </div>
      <div>
        <dt>Floor</dt>
        <dd>{offer.floor ?? "Unknown"}</dd>
      </div>
    </dl>
  );
}
export function OfferFactsSummary({ offer }: { offer: OfferFacts }) {
  return (
    <div className="offer-facts">
      <OfferPrice rent={offer.rent} />
      <PropertyLabel type={offer.propertyType} />
      <OfferSpecs offer={offer} />
      <FacilityIndicators offer={offer} />
      {offer.extraFacilities.length > 0 && (
        <ul className="facility-chips">
          {offer.extraFacilities.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
