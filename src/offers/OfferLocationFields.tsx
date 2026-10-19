import { lines, getStation } from "../rail/network";
import type { LocationDraft } from "./location";
export { locationDraft } from "./location";
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
