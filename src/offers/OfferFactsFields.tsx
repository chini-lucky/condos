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
      <label>
        Property type
        <select
          value={value.propertyType}
          onChange={(event) =>
            onChange({
              ...value,
              propertyType:
                event.target.value === "condominium"
                  ? "condominium"
                  : event.target.value === "townhouse"
                    ? "townhouse"
                    : "",
            })
          }
        >
          <option value="">Unknown</option>
          <option value="condominium">Condominium</option>
          <option value="townhouse">Townhouse</option>
        </select>
      </label>
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
    </fieldset>
  );
}
