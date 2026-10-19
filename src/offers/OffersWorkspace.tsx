import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../auth";
import { RailBrowser, LineBadges } from "../rail/RailBrowser";
import { OfferAgentCard } from "./OfferAgentCard";
import { OfferFactsSummary } from "./OfferFactsSummary";
import { OfferForm } from "./OfferForm";
import { getStation } from "../rail/network";
import type { Station } from "../rail/network";
import { StationOfferList, walkingDescription } from "./StationOfferList";
import { OfferMapOverlay } from "./OfferMapOverlay";
import { stationSummaries } from "./location";
import { offersRepository } from "./repository";
import type { Offer } from "./repository";
import "./offers.css";
import { OfferStatusDisplay } from "./OfferStatusDisplay";
import { OfferStatusEditor } from "./OfferStatusEditor";
import { OfferNotes } from "../notes/OfferNotes";
import { notesRepository } from "../notes/notesRepository";
import { parseRoute, parentRoute, navigate, routeHash } from "./navigation";
import type { Route } from "./navigation";
import type { CameraTarget } from "../rail/mapNavigation";
import { offerPosition } from "./location";
function routeFromHash(): Route {
  return parseRoute(location.hash);
}
const repository = supabase ? offersRepository(supabase) : null;
const noteRepository = supabase ? notesRepository(supabase) : null;
export function OffersWorkspace() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [notice, setNotice] = useState("");
  const [focusedStation, setFocusedStation] = useState<Station | null>(() => {
    const initial = routeFromHash();
    return "stationId" in initial && initial.stationId
      ? (getStation(initial.stationId) ?? null)
      : null;
  });
  const [cameraTarget, setCameraTarget] = useState<CameraTarget>(() => ({
    stationId: focusedStation?.id ?? null,
    key: location.hash,
  }));
  const automaticChange = useRef(false);
  const [highlightedOfferId, setHighlightedOfferId] = useState<string | null>(
    null,
  );
  const browseStation = useCallback((station: Station | null) => {
    setFocusedStation(station);
    const next: Route = { kind: "list", stationId: station?.id ?? null };
    if (location.hash === routeHash(next))
      setCameraTarget({
        stationId: station?.id ?? null,
        key: performance.now(),
      });
    navigate(next);
  }, []);
  const revision = useRef(0);
  const heading = useRef<HTMLDivElement>(null);
  const refresh = useCallback(async () => {
    if (!repository) return;
    const current = ++revision.current;
    try {
      const found = await repository.list();
      if (current === revision.current) {
        setOffers(found);
        setError(null);
        const currentRoute = routeFromHash();
        if ("id" in currentRoute) {
          const target = found.find((offer) => offer.id === currentRoute.id);
          if (target)
            setCameraTarget({
              stationId: target.stationId,
              key: `offer:${target.id}:${target.stationId}`,
            });
        }
      }
    } catch {
      if (current === revision.current)
        setError("Unable to load offers. Check your connection and try again.");
    } finally {
      if (current === revision.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const start = setTimeout(() => {
      void refresh();
    }, 0);
    const onFocus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearTimeout(start);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);
  useEffect(() => {
    const change = () => {
      const next = routeFromHash();
      setRoute(next);
      setNotice("");
      const stationId =
        "stationId" in next
          ? (next.stationId ?? null)
          : (offers.find((offer) => "id" in next && offer.id === next.id)
              ?.stationId ?? null);
      if ("stationId" in next)
        setFocusedStation(stationId ? (getStation(stationId) ?? null) : null);
      if (automaticChange.current) automaticChange.current = false;
      else
        setCameraTarget({
          stationId,
          key: "id" in next ? `offer:${next.id}:${stationId}` : routeHash(next),
        });
      if (!document.activeElement?.closest("svg")) heading.current?.focus();
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, [offers]);
  const back = useCallback(() => {
    const stationId =
      "id" in route
        ? (offers.find((offer) => offer.id === route.id)?.stationId ?? null)
        : (route.stationId ?? focusedStation?.id ?? null);
    navigate(parentRoute(route, stationId));
  }, [route, offers, focusedStation]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape" && route.kind !== "list") {
        event.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [back, route.kind]);
  function saved(offer: Offer) {
    setFocusedStation(
      offer.stationId ? (getStation(offer.stationId) ?? null) : null,
    );
    setOffers((current) => [
      offer,
      ...current.filter((item) => item.id !== offer.id),
    ]);
    navigate({ kind: "detail", id: offer.id });
    setNotice("Offer saved.");
  }
  const selected =
    "id" in route ? offers.find((offer) => offer.id === route.id) : null;
  const summaries = stationSummaries(offers);
  const invalidStation =
    (route.kind === "list" || route.kind === "add") &&
    route.stationId &&
    !getStation(route.stationId);
  const automaticStation = useCallback(
    (station: Station | null) => {
      if (route.kind !== "list") return;
      const next: Route = { kind: "list", stationId: station?.id ?? null };
      if (location.hash === routeHash(next)) return;
      automaticChange.current = true;
      setFocusedStation(station);
      navigate(next, true);
    },
    [route.kind],
  );
  const labelSides = new Map<string, "left" | "right">();
  const focusId = selected?.stationId ?? focusedStation?.id;
  if (focusId) {
    const station = getStation(focusId);
    if (station) {
      const positions = offers
        .filter((offer) => offer.stationId === focusId)
        .flatMap((offer) => {
          const point = offerPosition(offer);
          return point ? [point] : [];
        });
      const left = positions.filter((point) => point.x < station.x).length;
      const right = positions.length - left;
      labelSides.set(focusId, left < right ? "left" : "right");
    }
  }
  const unassigned = offers.filter((offer) => offer.stationId === null);
  const content = (
    <div className="offer-panel-content" ref={heading} tabIndex={-1}>
      {route.kind !== "list" && <button onClick={back}>Back</button>}
      {notice && <p role="status">{notice}</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            onClick={() => {
              void refresh();
            }}
          >
            Retry loading offers
          </button>
        </div>
      )}
      {loading ? (
        <p role="status">Loading offers…</p>
      ) : invalidStation ? (
        <>
          <h2>Station unavailable</h2>
          <p>This station is not on the supported rail map.</p>
          <button onClick={() => browseStation(null)}>
            Back to all stations
          </button>
        </>
      ) : route.kind === "list" ? (
        <>
          {summaries.length > 0 && (
            <section aria-label="Stations with offers">
              <h2>Stations with offers</h2>
              <ul className="station-summary-list">
                {summaries.map((summary) => {
                  const station = getStation(summary.stationId);
                  return station ? (
                    <li key={station.id}>
                      <button
                        aria-label={`Browse ${station.name}`}
                        onClick={() => browseStation(station)}
                      >
                        <LineBadges station={station} />
                        <strong>{station.name}</strong>
                        <span>
                          {summary.count}{" "}
                          {summary.count === 1 ? "offer" : "offers"}
                          {summary.lowestRent === null
                            ? ""
                            : ` · from ฿${summary.lowestRent.toLocaleString("en-GB")}`}
                        </span>
                      </button>
                    </li>
                  ) : null;
                })}
              </ul>
            </section>
          )}
          <h2>Unassigned</h2>
          <button onClick={() => navigate({ kind: "add" })}>Add offer</button>
          {unassigned.length === 0 ? (
            <p>
              {offers.length === 0
                ? "No offers yet. Add your first rental offer."
                : "No unassigned offers."}
            </p>
          ) : (
            <ul className="offer-list">
              {unassigned.map((offer) => (
                <li key={offer.id}>
                  <a href={`#offer=${offer.id}`}>{offer.name}</a>
                  <OfferStatusDisplay offer={offer} />
                  <OfferFactsSummary offer={offer} />
                </li>
              ))}
            </ul>
          )}
        </>
      ) : repository &&
        (route.kind === "add" || (route.kind === "edit" && selected)) ? (
        <OfferForm
          key={route.kind === "add" ? "new" : selected?.id}
          offer={route.kind === "edit" ? (selected ?? null) : null}
          repository={repository}
          initialStationId={
            route.kind === "add"
              ? (route.stationId ?? focusedStation?.id)
              : focusedStation?.id
          }
          onSaved={saved}
          onCancel={back}
        />
      ) : selected ? (
        <>
          <h2>{selected.name}</h2>
          <OfferStatusDisplay offer={selected} />
          {repository && (
            <OfferStatusEditor
              offer={selected}
              repository={repository}
              onSaved={saved}
            />
          )}
          <p>
            {selected.stationId
              ? `Station: ${getStation(selected.stationId)?.name ?? selected.stationId}`
              : "Station not assigned"}
          </p>
          <p>{walkingDescription(selected)}</p>
          <p>
            {selected.bearing === null
              ? "Direction unknown"
              : `Direction: ${selected.bearing}° clockwise from north`}
          </p>
          <OfferFactsSummary offer={selected} />
          <OfferAgentCard key={`agent-${selected.id}`} offer={selected} />

          <p>Added {formatDate(selected.createdAt)}</p>
          <p>Updated {formatDate(selected.updatedAt)}</p>
          <button onClick={() => navigate({ kind: "edit", id: selected.id })}>
            Edit offer
          </button>
          <a href={`#offer=${selected.id}`}>Direct link to offer</a>
          {noteRepository && (
            <OfferNotes
              key={selected.id}
              offerId={selected.id}
              repository={noteRepository}
            />
          )}
        </>
      ) : (
        <>
          <h2>Offer unavailable</h2>
          <p>This offer may have been removed, or you may not have access.</p>
          <button onClick={() => navigate({ kind: "list" })}>
            Back to Unassigned
          </button>
        </>
      )}
    </div>
  );
  return (
    <RailBrowser
      overview={content}
      panelContent={
        route.kind === "list" && !invalidStation ? undefined : content
      }
      panelMode={route.kind === "list" ? undefined : "full"}
      onStationChange={browseStation}
      onAutomaticStationChange={automaticStation}
      navigationLocked={route.kind !== "list"}
      cameraTarget={cameraTarget}
      labelSides={labelSides}
      selectedStationId={selected?.stationId ?? focusedStation?.id ?? null}
      stationOccupancy={
        new Map(summaries.map((summary) => [summary.stationId, summary.count]))
      }
      stationCounts={
        new Map(summaries.map((summary) => [summary.stationId, summary.count]))
      }
      mapOverlay={(view) => (
        <OfferMapOverlay
          offers={offers}
          view={view}
          highlightedOfferId={highlightedOfferId}
          selectedOfferId={selected?.id ?? null}
          onHighlight={setHighlightedOfferId}
          onOpen={(offer) => navigate({ kind: "detail", id: offer.id })}
        />
      )}
      renderStation={(station) => (
        <>
          {error && (
            <div role="alert">
              <p>{error}</p>
              <button
                onClick={() => {
                  void refresh();
                }}
              >
                Retry loading offers
              </button>
            </div>
          )}
          {loading ? (
            <p role="status">Loading offers…</p>
          ) : (
            <StationOfferList
              station={station}
              offers={offers}
              onAdd={() => navigate({ kind: "add", stationId: station.id })}
              highlightedOfferId={highlightedOfferId}
              onHighlight={setHighlightedOfferId}
              onSelectStation={browseStation}
            />
          )}
        </>
      )}
    />
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}
