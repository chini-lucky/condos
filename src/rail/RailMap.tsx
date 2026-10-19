import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent, ReactNode } from "react";
import {
  getStation,
  interchanges,
  lineIds,
  lineRoutes,
  lines,
  stations,
} from "./network";
import type { Station } from "./network";
import { stationLabels } from "./labels";
import { homeViewport, panBy, zoomAt } from "./viewport";
import { fitNetwork, focusViewport, semanticStation } from "./mapNavigation";
import type { MapView, CameraTarget } from "./mapNavigation";
import type { Point, Viewport } from "./viewport";

export interface RailMapProps {
  selectedStationId: string | null;
  onSelectStation: (station: Station | null) => void;
  /** Map-coordinate overlays, such as persisted offer pins. */
  children?: ReactNode | ((view: MapView) => ReactNode);
  cameraTarget: CameraTarget;
  onCameraChange?:
    ((view: MapView, reason: "manual" | "focus") => void) | undefined;
  labelSides?: ReadonlyMap<string, "left" | "right"> | undefined;
  stationCounts?: ReadonlyMap<string, number> | undefined;
  stationOccupancy?: ReadonlyMap<string, number> | undefined;
}

export function RailMap({
  selectedStationId,
  onSelectStation,
  children,
  stationCounts,
  stationOccupancy,
  cameraTarget,
  onCameraChange,
  labelSides,
}: RailMapProps) {
  const svg = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const moved = useRef(false);
  const [size, setSize] = useState({ width: 900, height: 900 });
  const [view, setView] = useState<Viewport>(homeViewport);
  const targetStation = cameraTarget.stationId
    ? getStation(cameraTarget.stationId)
    : undefined;
  const source = useRef<"manual" | "focus">("focus");
  const frame = useRef<number | null>(null);
  const currentView = useRef(view);
  useEffect(() => {
    currentView.current = view;
  }, [view]);
  function updateCamera(update: Viewport | ((current: Viewport) => Viewport)) {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    source.current = "manual";
    setView(update);
  }
  const scale = view.width / size.width;
  const labels = stationLabels(
    stations,
    scale,
    selectedStationId,
    view.width >= 850,
    interchanges.flat(),
    labelSides,
    [...(stationOccupancy ?? stationCounts ?? new Map<string, number>())]
      .filter(([, count]) => count > 0)
      .map(([id]) => id),
  );

  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    let previousSize: { width: number; height: number } | null = null;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const nextSize = {
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      };
      setSize(nextSize);
      const resizing = previousSize !== null;
      let destination = targetStation
        ? focusViewport(targetStation, nextSize)
        : fitNetwork(nextSize);
      if (previousSize) {
        const current = currentView.current;
        const scale = current.width / previousSize.width;
        const width = nextSize.width * scale;
        const height = nextSize.height * scale;
        destination = {
          x: current.x + (current.width - width) / 2,
          y: current.y + (current.height - height) / 2,
          width,
          height,
        };
      }
      previousSize = nextSize;
      source.current = "focus";
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      if (
        resizing ||
        matchMedia("(prefers-reduced-motion: reduce)").matches ||
        currentView.current === homeViewport
      ) {
        currentView.current = destination;
        setView(destination);
        return;
      }
      const start = currentView.current;
      const began = performance.now();
      function animate(now: number) {
        const progress = Math.min(1, (now - began) / 260);
        const eased = 1 - Math.pow(1 - progress, 3);
        setView({
          x: start.x + (destination.x - start.x) * eased,
          y: start.y + (destination.y - start.y) * eased,
          width: start.width + (destination.width - start.width) * eased,
          height: start.height + (destination.height - start.height) * eased,
        });
        frame.current = progress < 1 ? requestAnimationFrame(animate) : null;
      }
      frame.current = requestAnimationFrame(animate);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [targetStation, cameraTarget.key]);

  const candidates = stations.filter(
    (station) =>
      ((stationOccupancy ?? stationCounts)?.get(station.id) ?? 0) > 0,
  );
  const nearestStationId =
    semanticStation(
      3,
      { x: view.x + view.width / 2, y: view.y + view.height / 2 },
      candidates,
    ) ?? null;
  const blocked = [
    { x: 0, y: 0, width: Math.min(220, size.width), height: 80 },
    { x: size.width - 80, y: size.height - 125, width: 80, height: 125 },
    ...stations.map((station) => ({
      x: (station.x - view.x) / scale - 13,
      y: (station.y - view.y) / scale - 13,
      width: 26,
      height: 26,
    })),
    ...[...labels.entries()].map(([id, label]) => ({
      x:
        (label.x - view.x) / scale -
        (label.anchor === "end"
          ? (label.fontSize / scale) *
            0.58 *
            (getStation(id)?.name.length ?? 10)
          : 0),
      y: (label.y - label.fontSize - view.y) / scale,
      width:
        (label.fontSize / scale) * 0.58 * (getStation(id)?.name.length ?? 10),
      height: label.fontSize / scale + 6,
    })),
  ];
  const mapView: MapView = {
    viewport: view,
    size,
    scale,
    zoom: fitNetwork(size).width / view.width,
    focusedStationId: selectedStationId,
    nearestStationId,
    blocked,
  };
  useEffect(() => {
    const timer = setTimeout(() => {
      const candidates = stations.filter(
        (station) =>
          ((stationOccupancy ?? stationCounts)?.get(station.id) ?? 0) > 0,
      );
      const scale = view.width / size.width;
      const snapshot: MapView = {
        viewport: view,
        size,
        scale,
        zoom: fitNetwork(size).width / view.width,
        focusedStationId: selectedStationId,
        nearestStationId:
          semanticStation(
            3,
            { x: view.x + view.width / 2, y: view.y + view.height / 2 },
            candidates,
          ) ?? null,
        blocked: [],
      };
      onCameraChange?.(snapshot, source.current);
    }, 160);
    return () => clearTimeout(timer);
  }, [
    view,
    size,
    selectedStationId,
    stationCounts,
    stationOccupancy,
    onCameraChange,
  ]);

  function point(clientX: number, clientY: number): Point {
    const rect = svg.current?.getBoundingClientRect();
    return {
      x: view.x + (clientX - (rect?.left ?? 0)) * scale,
      y: view.y + (clientY - (rect?.top ?? 0)) * scale,
    };
  }
  function zoom(factor: number) {
    updateCamera((current) =>
      zoomAt(current, factor, {
        x: current.x + current.width / 2,
        y: current.y + current.height / 2,
      }),
    );
  }
  // Native non-passive wheel handling prevents browser/page zoom during trackpad pinch.
  useEffect(() => {
    const element = svg.current;
    if (!element) return;
    function wheel(event: WheelEvent) {
      event.preventDefault();
      const rect = element?.getBoundingClientRect();
      if (!rect) return;
      source.current = "manual";
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      setView((current) =>
        zoomAt(current, Math.exp(-event.deltaY * 0.002), {
          x:
            current.x +
            ((event.clientX - rect.left) / rect.width) * current.width,
          y:
            current.y +
            ((event.clientY - rect.top) / rect.height) * current.height,
        }),
      );
    }
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, []);

  function pointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    moved.current = false;
  }
  function pointerMove(event: PointerEvent<SVGSVGElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    const next = { x: event.clientX, y: event.clientY };
    const other = [...pointers.current.entries()].find(
      ([id]) => id !== event.pointerId,
    )?.[1];
    pointers.current.set(event.pointerId, next);
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) moved.current = true;
    updateCamera((current) => {
      let updated = panBy(
        current,
        (-dx * current.width) / size.width,
        (-dy * current.height) / size.height,
      );
      if (other) {
        const before = Math.hypot(previous.x - other.x, previous.y - other.y);
        const after = Math.hypot(next.x - other.x, next.y - other.y);
        if (before > 0 && after > 0)
          updated = zoomAt(updated, after / before, point(other.x, other.y));
      }
      return updated;
    });
  }
  function pointerUp(event: PointerEvent<SVGSVGElement>) {
    pointers.current.delete(event.pointerId);
    // Pointer capture retargets click. Resolve a tap against station hit targets explicitly.
    if (!moved.current && event.type === "pointerup") {
      const target = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest("[data-station]");
      const station = getStation(target?.getAttribute("data-station") ?? "");
      if (station) onSelectStation(station);
    }
  }
  function keyboard(event: KeyboardEvent<SVGSVGElement>) {
    const delta = 70 * scale;
    const changes: Record<string, [number, number]> = {
      ArrowLeft: [-delta, 0],
      ArrowRight: [delta, 0],
      ArrowUp: [0, -delta],
      ArrowDown: [0, delta],
    };
    const change = changes[event.key];
    if (change) {
      event.preventDefault();
      updateCamera((current) => panBy(current, ...change));
    }
    if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoom(1.4);
    }
    if (event.key === "-") {
      event.preventDefault();
      zoom(1 / 1.4);
    }
    if (event.key === "0" || event.key === "Home") {
      event.preventDefault();
      onSelectStation(null);
      updateCamera(fitNetwork(size));
    }
  }

  return (
    <div className="rail-map">
      <svg
        ref={svg}
        role="group"
        aria-label="Bangkok rail map"
        aria-describedby="map-keyboard-help"
        tabIndex={0}
        viewBox={`${view.x} ${view.y} ${view.width} ${view.height}`}
        onKeyDown={keyboard}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        onPointerCancel={pointerUp}
        onDoubleClick={(event) =>
          updateCamera((current) =>
            zoomAt(
              current,
              event.shiftKey ? 0.5 : 2,
              point(event.clientX, event.clientY),
            ),
          )
        }
      >
        <title>Bangkok BTS and MRT Blue station map</title>
        <path
          d="M-40,205 C60,225 160,245 190,300 S235,420 205,480 S150,540 172,585 S300,598 342,652 S420,705 520,712"
          className="rail-river"
        />
        <text
          x="205"
          y="420"
          transform="rotate(-74 205 420)"
          className="rail-river-label"
          fontSize={12 * scale}
        >
          Chao Phraya
        </text>
        {lineIds.map((id) =>
          lineRoutes[id].map((route, index) => (
            <polyline
              key={`${id}-${index}`}
              points={route
                .map((key) => {
                  const station = getStation(key);
                  return station ? `${station.x},${station.y}` : "";
                })
                .join(" ")}
              fill="none"
              stroke={lines[id].color}
              strokeWidth={4 * scale}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )),
        )}
        {interchanges.map(([a, b]) => {
          const first = getStation(a);
          const second = getStation(b);
          return first && second ? (
            <line
              key={a}
              x1={first.x}
              y1={first.y}
              x2={second.x}
              y2={second.y}
              stroke="#748076"
              strokeWidth={2 * scale}
              strokeDasharray={`${3 * scale} ${3 * scale}`}
            />
          ) : null;
        })}
        {stations.map((station) => {
          const active = selectedStationId === station.id;
          const count = stationCounts?.get(station.id) ?? 0;
          const label = labels.get(station.id);
          return (
            <g
              key={station.id}
              data-station={station.id}
              role="button"
              tabIndex={0}
              aria-label={`Select ${station.name}`}
              aria-pressed={active}
              onClick={(event) => {
                if (event.detail === 0) onSelectStation(station);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelectStation(station);
                }
              }}
              onFocus={() => {
                if (
                  station.x < view.x ||
                  station.x > view.x + view.width ||
                  station.y < view.y ||
                  station.y > view.y + view.height
                )
                  setView((current) => ({
                    ...current,
                    x: station.x - current.width / 2,
                    y: station.y - current.height / 2,
                  }));
              }}
            >
              <circle
                cx={station.x}
                cy={station.y}
                r={19 * scale}
                fill="transparent"
                className="rail-hit"
              />
              <circle
                cx={station.x}
                cy={station.y}
                r={(count > 0 ? 11 : active ? 7 : 4) * scale}
                className={
                  active || count > 0 ? "rail-dot selected" : "rail-dot"
                }
                strokeWidth={2 * scale}
              />
              {count > 0 && (
                <text
                  x={station.x}
                  y={station.y + 3.5 * scale}
                  textAnchor="middle"
                  fill="white"
                  fontSize={10 * scale}
                  pointerEvents="none"
                >
                  {count}
                </text>
              )}
              {label && (
                <text
                  x={label.x}
                  y={label.y}
                  textAnchor={label.anchor}
                  fontSize={label.fontSize}
                  strokeWidth={3 * scale}
                  className={
                    active ||
                    (stationOccupancy ?? stationCounts)?.get(station.id)
                      ? "rail-label selected"
                      : "rail-label"
                  }
                >
                  {station.name}
                </text>
              )}
            </g>
          );
        })}
        {typeof children === "function" ? children(mapView) : children}
      </svg>
      <p id="map-keyboard-help" className="sr-only">
        Arrow keys pan. Plus and minus zoom. Home resets. Tab to a station and
        press Enter to select it.
      </p>
      <div className="rail-zoom" aria-label="Map controls">
        <button onClick={() => zoom(1.4)} aria-label="Zoom in">
          +
        </button>
        <button onClick={() => zoom(1 / 1.4)} aria-label="Zoom out">
          −
        </button>
      </div>
    </div>
  );
}
