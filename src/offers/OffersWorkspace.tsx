import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { supabase } from "../auth";
import { OfferForm } from "./OfferForm";
import { offersRepository } from "./repository";
import type { Offer } from "./repository";
import "./offers.css";
type Route =
  { kind: "list" } | { kind: "add" } | { kind: "detail" | "edit"; id: string };
function routeFromHash(): Route {
  const params = new URLSearchParams(location.hash.slice(1));
  const id = params.get("offer");
  if (id) return { kind: params.has("edit") ? "edit" : "detail", id };
  return { kind: params.has("add-offer") ? "add" : "list" };
}
function navigate(route: Route) {
  location.hash =
    route.kind === "list"
      ? "offers"
      : route.kind === "add"
        ? "add-offer"
        : `offer=${encodeURIComponent(route.id)}${route.kind === "edit" ? "&edit" : ""}`;
}
const repository = supabase ? offersRepository(supabase) : null;
const positions = ["peek", "half", "full"] as const;
export function OffersWorkspace({ children }: { children?: ReactNode }) {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [sheet, setSheet] = useState<(typeof positions)[number]>(
    route.kind === "list" ? "peek" : "full",
  );
  const [collapsed, setCollapsed] = useState(false);
  const [notice, setNotice] = useState("");
  const revision = useRef(0);
  const drag = useRef<number | null>(null);
  const heading = useRef<HTMLDivElement>(null);
  const refresh = useCallback(async () => {
    if (!repository) return;
    const current = ++revision.current;
    try {
      const found = await repository.list();
      if (current === revision.current) {
        setOffers(found);
        setError(null);
      }
    } catch {
      if (current === revision.current)
        setError("Unable to load offers. Check your connection and try again.");
    } finally {
      if (current === revision.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const onFocus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      revision.current++;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);
  useEffect(() => {
    const change = () => {
      const next = routeFromHash();
      setRoute(next);
      setSheet(next.kind === "list" ? "peek" : "full");
      setCollapsed(false);
      setNotice("");
      heading.current?.focus();
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  const back = useCallback(() => {
    navigate(
      route.kind === "edit"
        ? { kind: "detail", id: route.id }
        : { kind: "list" },
    );
  }, [route]);
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
    setOffers((current) => [
      offer,
      ...current.filter((item) => item.id !== offer.id),
    ]);
    navigate({ kind: "detail", id: offer.id });
    setNotice("Offer saved.");
  }
  function resize(direction: number) {
    setSheet(
      (current) =>
        positions[
          Math.max(0, Math.min(2, positions.indexOf(current) + direction))
        ] ?? "peek",
    );
  }
  const selected =
    "id" in route ? offers.find((offer) => offer.id === route.id) : null;
  const isForm = route.kind === "add" || route.kind === "edit";
  return (
    <section className="offers-workspace" aria-label="Rental offers">
      <div className="offers-map">
        {children ?? (
          <p className="map-placeholder">
            Explore your Bangkok rental shortlist
          </p>
        )}
      </div>
      <button
        className="panel-toggle"
        aria-expanded={!collapsed}
        aria-controls="offers-panel"
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? "Open offers panel" : "Collapse offers panel"}
      </button>
      <aside
        id="offers-panel"
        className={`offers-panel ${collapsed ? "collapsed" : ""} sheet-${isForm ? "full" : sheet}`}
        aria-label="Offers panel"
      >
        <div
          className="sheet-handle"
          role="separator"
          tabIndex={0}
          aria-label="Resize offers panel"
          aria-orientation="horizontal"
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={positions.indexOf(sheet)}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              resize(event.key === "ArrowUp" ? 1 : -1);
            }
          }}
          onPointerDown={(event) => {
            drag.current = event.clientY;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerUp={(event) => {
            if (
              drag.current !== null &&
              Math.abs(event.clientY - drag.current) > 40
            )
              resize(event.clientY < drag.current ? 1 : -1);
            drag.current = null;
          }}
        >
          <span />
        </div>
        <div className="sheet-controls">
          <button onClick={() => resize(1)}>Expand panel</button>
          <button onClick={() => resize(-1)}>Reduce panel</button>
        </div>
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
          ) : route.kind === "list" ? (
            <>
              <h2>Unassigned</h2>
              <button onClick={() => navigate({ kind: "add" })}>
                Add offer
              </button>
              {offers.length === 0 ? (
                <p>No offers yet. Add your first rental offer.</p>
              ) : (
                <ul className="offer-list">
                  {offers.map((offer) => (
                    <li key={offer.id}>
                      <a href={`#offer=${offer.id}`}>{offer.name}</a>
                      <span>{offer.status}</span>
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
              onSaved={saved}
              onCancel={back}
            />
          ) : selected ? (
            <>
              <h2>{selected.name}</h2>
              <p>{selected.status}</p>
              <p>Station not assigned</p>
              <p>Rent not recorded</p>
              <p>Added {formatDate(selected.createdAt)}</p>
              <p>Updated {formatDate(selected.updatedAt)}</p>
              <button
                onClick={() => navigate({ kind: "edit", id: selected.id })}
              >
                Edit offer
              </button>
              <a href={`#offer=${selected.id}`}>Direct link to offer</a>
            </>
          ) : (
            <>
              <h2>Offer unavailable</h2>
              <p>
                This offer may have been removed, or you may not have access.
              </p>
              <button onClick={() => navigate({ kind: "list" })}>
                Back to Unassigned
              </button>
            </>
          )}
        </div>
      </aside>
    </section>
  );
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}
