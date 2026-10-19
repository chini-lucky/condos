import type { ReactNode } from "react";
import { OffersOverview } from "./OffersOverview";
import { OfferDossier } from "./OfferDossier";
import { useCallback, useEffect, useRef, useState } from "react";
import { deletionsRepository } from "../deletions/repository";
import { supabase } from "../auth";
import { RailBrowser } from "../rail/RailBrowser";
import { TrashList, TrashedOffer } from "./TrashList";
import { OfferForm } from "./OfferForm";
import { getStation } from "../rail/network";
import type { Station } from "../rail/network";
import { StationOfferList } from "./StationOfferList";
import { OfferMapOverlay } from "./OfferMapOverlay";
import { stationSummaries } from "./location";
import { OfferFiltersBar } from "./OfferFiltersBar";
import {
  defaultFilters,
  matchingStationSummaries,
  offerFilterOpacity,
} from "./filters";
import { offersRepository } from "./repository";
import type { Offer } from "./repository";
import "./offers.css";
import { notesRepository } from "../notes/notesRepository";
import { parseRoute, parentRoute, navigate, routeHash } from "./navigation";
import type { Route } from "./navigation";
import type { CameraTarget } from "../rail/mapNavigation";
import { offerPosition } from "./location";
function routeFromHash(): Route {
  return parseRoute(location.hash);
}
const repository = supabase ? offersRepository(supabase) : null;
const deletionRepository = supabase ? deletionsRepository(supabase) : null;
const noteRepository = supabase ? notesRepository(supabase) : null;
export function OffersWorkspace({
  accountActions,
}: {
  accountActions?: ReactNode;
}) {
  const [filters, setFilters] = useState(defaultFilters);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [retainedOffer, setRetainedOffer] = useState<Offer | null>(null);
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
      const found = await repository.list("all");
      if (current === revision.current) {
        setOffers(found);
        setError(null);
        const currentRoute = routeFromHash();
        if ("id" in currentRoute) {
          const target = found.find((offer) => offer.id === currentRoute.id);
          setRetainedOffer((previous) =>
            target && target.trashedAt === null
              ? target
              : previous?.id === currentRoute.id
                ? previous
                : null,
          );
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
      setRetainedOffer((previous) => {
        if (!("id" in next)) return null;
        if (previous?.id === next.id) return previous;
        const target = offers.find((offer) => offer.id === next.id);
        return target?.trashedAt === null ? target : null;
      });
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
      if (!document.activeElement?.closest("svg"))
        heading.current?.focus({ preventScroll: true });
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, [offers]);
  const back = useCallback(() => {
    const stationId =
      "id" in route
        ? (offers.find((offer) => offer.id === route.id)?.stationId ?? null)
        : "stationId" in route
          ? (route.stationId ?? focusedStation?.id ?? null)
          : null;
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
    setRetainedOffer(offer);
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
  function permanentlyDeleted(id: string) {
    setOffers((current) => current.filter((offer) => offer.id !== id));
    navigate({ kind: "trash" });
    setNotice(
      "Offer permanently deleted. Photo cleanup status is shown below.",
    );
  }
  const selected =
    "id" in route ? offers.find((offer) => offer.id === route.id) : null;
  const retained =
    "id" in route && retainedOffer?.id === route.id ? retainedOffer : null;
  const unavailable =
    (retained?.trashedAt === null &&
      (!selected || selected.trashedAt !== null)) ||
    (route.kind === "edit" && Boolean(selected?.trashedAt));
  const sessionOffer = selected ?? retained;
  const activeOffers = offers.filter((offer) => offer.trashedAt === null);
  const trashedOffers = offers.filter((offer) => offer.trashedAt !== null);
  const occupancy = stationSummaries(activeOffers);
  const summaries = matchingStationSummaries(activeOffers, filters);
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
      const positions = activeOffers
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
  const content = (
    <div className="offer-panel-content" ref={heading} tabIndex={-1}>
      {route.kind !== "list" &&
        (route.kind !== "detail" ||
          !sessionOffer ||
          (selected?.trashedAt && !unavailable)) && (
          <button className="icon-button" onClick={back} aria-label="Back">
            ‹
          </button>
        )}
      {notice && <p role="status">{notice}</p>}
      {unavailable && (
        <div role="alert" className="unavailable-drafts">
          <p>
            {selected?.trashedAt
              ? "This offer is in Trash."
              : "This offer was permanently deleted or is no longer accessible."}{" "}
            Your drafts are kept. Saving is disabled; copy any unsaved text
            before leaving.
          </p>
          {selected?.trashedAt && (
            <a
              href={`#offer=${selected.id}`}
              onClick={() => setRetainedOffer(null)}
            >
              Open recovery options
            </a>
          )}
          <button
            onClick={() => {
              setRetainedOffer(null);
              navigate({ kind: "trash" });
            }}
          >
            Exit unavailable offer
          </button>
        </div>
      )}
      {route.kind === "list" && (
        <button
          className="quiet-button panel-trash"
          onClick={() => navigate({ kind: "trash" })}
        >
          Trash
        </button>
      )}
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
        <OffersOverview
          offers={activeOffers}
          filters={filters}
          onStation={browseStation}
          onAdd={() => navigate({ kind: "add" })}
          highlightedOfferId={highlightedOfferId}
          onHighlight={setHighlightedOfferId}
        />
      ) : route.kind === "trash" && repository && deletionRepository ? (
        <TrashList
          offers={trashedOffers}
          repository={repository}
          onRestored={saved}
          deletionRepository={deletionRepository}
          onDeleted={permanentlyDeleted}
        />
      ) : selected?.trashedAt &&
        !unavailable &&
        repository &&
        deletionRepository &&
        route.kind !== "edit" ? (
        <TrashedOffer
          offer={selected}
          repository={repository}
          onRestored={saved}
          deletionRepository={deletionRepository}
          onDeleted={permanentlyDeleted}
        />
      ) : repository &&
        (route.kind === "add" || (route.kind === "edit" && sessionOffer)) ? (
        <>
          <OfferForm
            key={route.kind === "add" ? "new" : sessionOffer?.id}
            offer={route.kind === "edit" ? sessionOffer : null}
            unavailable={Boolean(unavailable)}
            repository={repository}
            initialStationId={
              route.kind === "add"
                ? (route.stationId ?? focusedStation?.id)
                : focusedStation?.id
            }
            onSaved={saved}
            onCancel={back}
          />
        </>
      ) : sessionOffer && repository ? (
        <OfferDossier
          offer={sessionOffer}
          unavailable={Boolean(unavailable)}
          repository={repository}
          notes={noteRepository}
          onSaved={saved}
          onEdit={() => navigate({ kind: "edit", id: sessionOffer.id })}
          onBack={back}
          onTrashed={(offer) => {
            saved(offer);
            setNotice("Offer moved to Trash.");
          }}
        />
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
      contentKey={routeHash(route)}
      mapControls={
        <div className="map-chrome">
          <OfferFiltersBar value={filters} onChange={setFilters} />
          <div className="account-actions">{accountActions}</div>
        </div>
      }
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
        new Map(occupancy.map((summary) => [summary.stationId, summary.count]))
      }
      stationCounts={
        new Map(summaries.map((summary) => [summary.stationId, summary.count]))
      }
      mapOverlay={(view) => (
        <OfferMapOverlay
          offers={activeOffers}
          opacityByOffer={
            new Map(
              activeOffers.map((offer) => [
                offer.id,
                offerFilterOpacity(offer, filters),
              ]),
            )
          }
          view={view}
          highlightedOfferId={highlightedOfferId}
          selectedOfferId={selected?.id ?? null}
          onHighlight={setHighlightedOfferId}
          onOpen={(offer) => navigate({ kind: "detail", id: offer.id })}
        />
      )}
      renderStation={(station) => (
        <>
          <button
            className="quiet-button panel-trash"
            onClick={() => navigate({ kind: "trash" })}
          >
            Trash
          </button>
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
              offers={activeOffers}
              filters={filters}
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
