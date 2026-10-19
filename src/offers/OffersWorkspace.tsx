import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../auth";
import { RailBrowser } from "../rail/RailBrowser";
import { OfferForm } from "./OfferForm";
import { offersRepository } from "./repository";
import type { Offer } from "./repository";
import "./offers.css";
import { OfferNotes } from "../notes/OfferNotes";
import { notesRepository } from "../notes/notesRepository";
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
const noteRepository = supabase ? notesRepository(supabase) : null;
export function OffersWorkspace() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [notice, setNotice] = useState("");
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
  const selected =
    "id" in route ? offers.find((offer) => offer.id === route.id) : null;
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
      ) : route.kind === "list" ? (
        <>
          <h2>Unassigned</h2>
          <button onClick={() => navigate({ kind: "add" })}>Add offer</button>
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
      panelContent={route.kind === "list" ? undefined : content}
      panelMode={route.kind === "list" ? undefined : "full"}
      onStationChange={() => navigate({ kind: "list" })}
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
