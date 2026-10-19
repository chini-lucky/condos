import { useState } from "react";
import { facilityNames, type FactsDraft } from "./facts";
export function OfferFacilities({
  value,
  onChange,
}: {
  value: FactsDraft;
  onChange: (value: FactsDraft) => void;
}) {
  const [extra, setExtra] = useState("");
  const [error, setError] = useState("");
  function add() {
    const name = extra.trim();
    if (!name) {
      setError("Enter a facility name.");
      return;
    }
    if (
      value.extraFacilities.some(
        (item) => item.toLowerCase() === name.toLowerCase(),
      )
    ) {
      setError("That facility is already listed.");
      return;
    }
    onChange({ ...value, extraFacilities: [...value.extraFacilities, name] });
    setExtra("");
    setError("");
  }
  return (
    <fieldset>
      <legend>Facilities (optional)</legend>
      {facilityNames.map((key) => (
        <label key={key}>
          {key.charAt(0).toUpperCase() + key.slice(1)}
          <select
            aria-label={key.charAt(0).toUpperCase() + key.slice(1)}
            value={
              value[key] === null
                ? "unknown"
                : value[key]
                  ? "present"
                  : "absent"
            }
            onChange={(event) =>
              onChange({
                ...value,
                [key]:
                  event.target.value === "unknown"
                    ? null
                    : event.target.value === "present",
              })
            }
          >
            <option value="unknown">Unknown</option>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
          </select>
        </label>
      ))}
      <label>
        Extra facility
        <input
          value={extra}
          onChange={(event) => setExtra(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add();
            }
          }}
        />
      </label>
      <button type="button" onClick={add}>
        Add facility
      </button>
      {error && <p role="alert">{error}</p>}
      <ul className="facility-chips">
        {value.extraFacilities.map((name) => (
          <li key={name}>
            {name}
            <button
              type="button"
              aria-label={`Remove ${name}`}
              onClick={() =>
                onChange({
                  ...value,
                  extraFacilities: value.extraFacilities.filter(
                    (item) => item !== name,
                  ),
                })
              }
            >
              ×
            </button>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
