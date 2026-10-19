import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { RailMap } from "./RailMap";
import { getStation, interchanges, lineIds, lines, stations } from "./network";
import type { Station } from "./network";
import "./rail.css";
import { semanticStation } from "./mapNavigation";
import type { MapView, CameraTarget } from "./mapNavigation";

export function LineBadges({ station }: { station: Station }) {
  const memberships = new Set(station.lines);
  for (const pair of interchanges) {
    if (!pair.includes(station.id)) continue;
    for (const id of pair)
      for (const line of getStation(id)?.lines ?? []) memberships.add(line);
  }
  return (
    <span className="rail-badges">
      {lineIds
        .filter((id) => memberships.has(id))
        .map((id) => (
          <span
            key={id}
            style={{ background: lines[id].color }}
            aria-label={lines[id].name}
          >
            {lines[id].badge}
          </span>
        ))}
    </span>
  );
}

export interface RailBrowserProps {
  /** Later offer tickets compose their station content here without coupling reference data to persistence. */
  renderStation?: (station: Station) => ReactNode;
  overview?: ReactNode;
  panelContent?: ReactNode;
  contentKey?: string;
  panelMode?: "full" | undefined;
  onStationChange?: (station: Station | null) => void;
  selectedStationId?: string | null | undefined;
  mapOverlay?: ReactNode | ((view: MapView) => ReactNode);
  mapControls?: ReactNode;
  cameraTarget?: CameraTarget;
  onAutomaticStationChange?: (station: Station | null) => void;
  navigationLocked?: boolean;
  labelSides?: ReadonlyMap<string, "left" | "right">;
  stationCounts?: ReadonlyMap<string, number>;
  stationOccupancy?: ReadonlyMap<string, number>;
}
export function RailBrowser({
  renderStation,
  overview,
  panelContent,
  contentKey,
  panelMode,
  onStationChange,
  selectedStationId,
  mapOverlay,
  mapControls,
  stationCounts,
  stationOccupancy,
  cameraTarget,
  onAutomaticStationChange,
  navigationLocked = false,
  labelSides,
}: RailBrowserProps) {
  const [internalStation, setStation] = useState<Station | null>(null);
  const station =
    selectedStationId === undefined
      ? internalStation
      : (getStation(selectedStationId ?? "") ?? null);
  const [internalCamera, setInternalCamera] = useState<CameraTarget>({
    stationId: selectedStationId ?? null,
    key: 0,
  });
  const [collapsed, setCollapsed] = useState(false);
  const [sheet, setSheet] = useState<"peek" | "half" | "full">("peek");
  const panelScroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panelScroll.current?.scrollTo({ top: 0 });
  }, [contentKey, station?.id]);
  const dragStart = useRef<number | null>(null);
  const dragged = useRef(false);
  useEffect(() => {
    function escape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented && !panelContent) {
        setStation(null);
        setInternalCamera((current) => ({
          stationId: null,
          key: Number(current.key) + 1,
        }));
        onStationChange?.(null);
        setSheet("peek");
      }
    }
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [panelContent, onStationChange]);
  function select(next: Station | null) {
    onStationChange?.(next);
    setStation(next);
    setInternalCamera((current) => ({
      stationId: next?.id ?? null,
      key: Number(current.key) + 1,
    }));
    setCollapsed(false);
    setSheet("peek");
  }
  const cameraChanged = useCallback(
    (view: MapView, reason: "manual" | "focus") => {
      if (reason !== "manual" || navigationLocked || panelContent) return;
      const candidates = stations.filter(
        (item) => ((stationOccupancy ?? stationCounts)?.get(item.id) ?? 0) > 0,
      );
      const id = semanticStation(
        view.zoom,
        {
          x: view.viewport.x + view.viewport.width / 2,
          y: view.viewport.y + view.viewport.height / 2,
        },
        candidates,
      );
      if (id === undefined || id === (station?.id ?? null)) return;
      const next = id ? (getStation(id) ?? null) : null;
      setStation(next);
      setSheet("peek");
      if (onAutomaticStationChange) onAutomaticStationChange(next);
      else onStationChange?.(next);
    },
    [
      navigationLocked,
      panelContent,
      stationCounts,
      stationOccupancy,
      station?.id,
      onAutomaticStationChange,
      onStationChange,
    ],
  );

  return (
    <main
      className={`rail-browser ${station ? "station-open" : "overview-open"} ${collapsed ? "panel-collapsed" : ""}`}
    >
      <div className="rail-stage">
        {mapControls}
        <div className="rail-map-surface">
          <RailMap
            selectedStationId={station?.id ?? null}
            onSelectStation={select}
            stationCounts={stationCounts}
            stationOccupancy={stationOccupancy}
            cameraTarget={cameraTarget ?? internalCamera}
            onCameraChange={cameraChanged}
            labelSides={labelSides}
          >
            {mapOverlay}
          </RailMap>
          {(station || collapsed) && (
            <button
              className="rail-home"
              onClick={() => {
                select(null);
              }}
            >
              All stations
            </button>
          )}
        </div>
      </div>

      <aside
        className={`rail-panel sheet-${panelMode ?? sheet}`}
        aria-label={
          panelContent
            ? "Offer details"
            : station
              ? "Station details"
              : "Stations"
        }
      >
        <button
          className="rail-sheet-handle"
          aria-label={
            sheet === "full" ? "Collapse station sheet" : "Expand station sheet"
          }
          onPointerDown={(event) => {
            dragged.current = false;
            dragStart.current = event.clientY;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            if (dragStart.current === null) return;
            const delta = event.clientY - dragStart.current;
            dragStart.current = null;
            if (Math.abs(delta) > 30) {
              dragged.current = true;
              setSheet(
                delta < 0
                  ? sheet === "peek"
                    ? "half"
                    : "full"
                  : sheet === "full"
                    ? "half"
                    : "peek",
              );
            }
          }}
          onClick={() => {
            if (dragged.current) {
              dragged.current = false;
              return;
            }
            setSheet(
              sheet === "peek" ? "half" : sheet === "half" ? "full" : "peek",
            );
          }}
        >
          <span />
        </button>
        <button
          className="rail-panel-toggle"
          aria-label={
            collapsed ? "Expand station panel" : "Collapse station panel"
          }
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? "›" : "‹"}
        </button>
        <div className="rail-panel-content" ref={panelScroll}>
          {panelContent ??
            (station ? (
              <>
                <button className="rail-back" onClick={() => select(null)}>
                  ‹ All stations
                </button>
                <LineBadges station={station} />
                <h1>{station.name}</h1>
                {renderStation ? (
                  renderStation(station)
                ) : (
                  <>
                    <p className="rail-muted">0 offers</p>
                    <div className="rail-empty">Nothing on file here yet.</div>
                  </>
                )}
              </>
            ) : (
              <>
                <h1>
                  Condos <span>Bangkok</span>
                </h1>
                {overview ?? (
                  <p className="rail-muted">No offers on file yet.</p>
                )}
              </>
            ))}
          {!panelContent && (
            <>
              <div className="rail-station-picker">
                <label htmlFor="station-picker">Choose a station</label>
                <select
                  id="station-picker"
                  value={station?.id ?? ""}
                  onChange={(event) =>
                    select(getStation(event.target.value) ?? null)
                  }
                >
                  <option value="">All stations</option>
                  {Object.entries(lines).map(([id, line]) => (
                    <optgroup key={id} label={line.name}>
                      {line.stations.map((key) => {
                        const stop = stations.find((item) => item.id === key);
                        return stop ? (
                          <option key={key} value={key}>
                            {stop.name}
                          </option>
                        ) : null;
                      })}
                    </optgroup>
                  ))}
                </select>
              </div>
              <ul className="rail-legend" aria-label="Rail lines">
                {Object.entries(lines).map(([id, line]) => (
                  <li key={id}>
                    <span style={{ background: line.color }}>{line.badge}</span>
                    {line.name.replace(/^(BTS|MRT) /, "")}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </aside>
    </main>
  );
}
