import { FilterIcon } from "./FilterIcon";
import { useState } from "react";
import { facilityNames, type FacilityName, type PropertyType } from "./facts";
import {
  defaultFilters,
  filtersActive,
  filterSummary,
  type OfferFilters,
} from "./filters";
import "./filters.css";
export function OfferFiltersBar({
  value,
  onChange,
}: {
  value: OfferFilters;
  onChange: (value: OfferFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  function facility(name: FacilityName, checked: boolean) {
    onChange({
      ...value,
      facilities: checked
        ? [...value.facilities, name]
        : value.facilities.filter((item) => item !== name),
    });
  }
  function type(name: PropertyType, checked: boolean) {
    onChange({
      ...value,
      types: checked
        ? [...value.types, name]
        : value.types.filter((item) => item !== name),
    });
  }
  return (
    <div className={`offer-filters ${open ? "filters-open" : ""}`}>
      <button
        className="filters-pill"
        type="button"
        aria-label="Filters"
        aria-expanded={open}
        aria-controls="offer-filter-controls"
        onClick={() => setOpen(!open)}
      >
        Filters
        {filtersActive(value) && (
          <span className="filters-dot" aria-hidden="true">
            ●
          </span>
        )}
      </button>
      <fieldset id="offer-filter-controls" aria-label="Offer filters">
        <legend>Filter offers</legend>
        <span className="filter-heading" aria-hidden="true">
          Filters
        </span>
        <div className="filter-toggles">
          {facilityNames.map((name) => (
            <label key={name}>
              <input
                type="checkbox"
                checked={value.facilities.includes(name)}
                onChange={(event) => facility(name, event.target.checked)}
              />
              <FilterIcon name={name} />
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </label>
          ))}
          {(["condominium", "townhouse"] as const).map((name) => (
            <label key={name}>
              <input
                type="checkbox"
                checked={value.types.includes(name)}
                onChange={(event) => type(name, event.target.checked)}
              />
              <FilterIcon name={name} />
              {name.charAt(0).toUpperCase() + name.slice(1)}
            </label>
          ))}
        </div>
        <label className="filter-rent">
          <span className="filter-rent-title" aria-hidden="true">
            Max rent
          </span>{" "}
          <output>
            {value.rentLimit === null
              ? "Any rent"
              : `≤ ฿${value.rentLimit.toLocaleString("en-GB")}`}
          </output>
          <input
            aria-label="Maximum monthly rent"
            type="range"
            min="10000"
            max="35000"
            step="500"
            value={value.rentLimit ?? 35000}
            onChange={(event) =>
              onChange({
                ...value,
                rentLimit:
                  Number(event.target.value) === 35000
                    ? null
                    : Number(event.target.value),
              })
            }
          />
        </label>
        <button type="button" onClick={() => onChange(defaultFilters())}>
          Clear filters
        </button>
      </fieldset>
      <p role="status" aria-label="Filter summary">
        {filterSummary(value)}
      </p>
    </div>
  );
}
