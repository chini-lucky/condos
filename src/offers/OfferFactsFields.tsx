import { FilterIcon } from "./FilterIcon";
import type { FactsDraft } from "./facts";
export function OfferFactsFields({
  value,
  onChange,
}: {
  value: FactsDraft;
  onChange: (value: FactsDraft) => void;
}) {
  return (
    <fieldset>
      <legend>Rental facts (optional)</legend>
      <fieldset className="property-choices">
        <legend>Property type</legend>
        {(["condominium", "townhouse", ""] as const).map((type) => (
          <label key={type}>
            <input
              type="radio"
              name="property-type"
              value={type}
              checked={value.propertyType === type}
              onChange={() => onChange({ ...value, propertyType: type })}
            />
            {type ? (
              <FilterIcon name={type} />
            ) : (
              <span aria-hidden="true">?</span>
            )}
            {type === "condominium"
              ? "Condominium"
              : type === "townhouse"
                ? "Townhouse"
                : "Unknown"}
          </label>
        ))}
      </fieldset>
      <div className="facts-fields-grid">
        {(
          [
            ["rent", "Monthly rent (THB)", "0.01", "0.01"],
            ["sizeSqm", "Size (m²)", "0.01", "0.01"],
            ["beds", "Beds (0 for studio)", "1", "0"],
            ["floor", "Floor", "1", undefined],
          ] as const
        ).map(([key, label, step, min]) => (
          <label key={key}>
            {label}
            <input
              type="number"
              step={step}
              min={min}
              value={value[key]}
              onChange={(event) =>
                onChange({ ...value, [key]: event.target.value })
              }
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}
