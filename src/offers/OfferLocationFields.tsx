import { lines, getStation } from "../rail/network";
import type { OfferLocation } from "./location";
import type { LocationDraft } from "./location";
export { locationDraft } from "./location";
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
export function OfferLocationFields({
  value,
  onChange,
}: {
  value: LocationDraft;
  onChange: (draft: LocationDraft) => void;
}) {
  return (
    <fieldset className="offer-location-fields">
      <legend>Location (optional)</legend>
      <label>
        Station
        <select
          aria-label="Station"
          value={value.stationId}
          onChange={(event) =>
            onChange({ ...value, stationId: event.target.value })
          }
        >
          <option value="">Unassigned</option>
          {Object.entries(lines).map(([id, line]) => (
            <optgroup key={id} label={line.name}>
              {line.stations.map((id) => {
                const station = getStation(id);
                return station ? (
                  <option key={id} value={id}>
                    {station.name}
                  </option>
                ) : null;
              })}
            </optgroup>
          ))}
        </select>
      </label>
      <label>
        Walking distance (metres)
        <input
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          value={value.walkingMetres}
          onChange={(event) =>
            onChange({ ...value, walkingMetres: event.target.value })
          }
        />
      </label>
      <label>
        Direction (degrees clockwise from north)
        <input
          type="number"
          min="0"
          max="359.999999"
          step="any"
          inputMode="decimal"
          value={value.bearing}
          onChange={(event) =>
            onChange({ ...value, bearing: event.target.value })
          }
        />
      </label>
      <p>
        North 0° · East 90° · South 180° · West 270°. Distance and direction can
        be left unknown. Pins show an approximate schematic position, not a
        measured walking route.
      </p>
    </fieldset>
  );
}
