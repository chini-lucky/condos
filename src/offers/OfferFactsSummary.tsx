import { facilityNames, type OfferFacts } from "./facts";
export function OfferFactsSummary({ offer }: { offer: OfferFacts }) {
  return (
    <div className="offer-facts">
      <p>
        {offer.rent === null
          ? "Rent not recorded"
          : `฿${offer.rent.toLocaleString("en-GB")} / month`}
      </p>
      <p>
        {offer.propertyType === null
          ? "Type unknown"
          : offer.propertyType === "condominium"
            ? "Condominium"
            : "Townhouse"}
        {" · "}
        {offer.sizeSqm === null ? "Size unknown" : `${offer.sizeSqm} m²`}
        {" · "}
        {offer.beds === null
          ? "Beds unknown"
          : offer.beds === 0
            ? "Studio (0 beds)"
            : `${offer.beds} beds`}
        {" · "}
        {offer.floor === null ? "Floor unknown" : `Floor ${offer.floor}`}
      </p>
      <>
        <ul className="facility-summary">
          {facilityNames.map((key) => (
            <li key={key}>
              {offer[key] === null ? "?" : offer[key] ? "✓" : "✕"}{" "}
              {key.charAt(0).toUpperCase() + key.slice(1)}:{" "}
              {offer[key] === null
                ? "Unknown"
                : offer[key]
                  ? "Present"
                  : "Absent"}
            </li>
          ))}
        </ul>
        <ul className="facility-chips">
          {offer.extraFacilities.map((name) => (
            <li key={name}>{name}</li>
          ))}
        </ul>
      </>
    </div>
  );
}
