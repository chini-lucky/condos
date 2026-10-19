import { CopyDraftButton } from "./CopyDraftButton";
import { OfferContactFields } from "./OfferContactFields";
import { OfferAgentCard } from "./OfferAgentCard";
import { contactsDraft, parseContacts } from "./contacts";
import { useState } from "react";
import { OfferFactsSummary } from "./OfferFactsSummary";
import { OfferFactsFields } from "./OfferFactsFields";
import { OfferFacilities } from "./OfferFacilities";
import { factsDraft, parseFacts } from "./facts";
import type { Offer, OffersRepository } from "./repository";
import { OfferFailure } from "./repository";
import { OfferLocationFields } from "./OfferLocationFields";
import { locationDraft, parseLocation } from "./location";
export function OfferForm({
  offer,
  repository,
  onSaved,
  onCancel,
  initialStationId,
  unavailable = false,
}: {
  offer: Offer | null;
  repository: OffersRepository;
  onSaved: (offer: Offer) => void;
  onCancel: () => void;
  initialStationId?: string | undefined;
  unavailable?: boolean;
}) {
  const [contacts, setContacts] = useState(() => contactsDraft(offer));
  const [facts, setFacts] = useState(() => factsDraft(offer));
  const [name, setName] = useState(offer?.name ?? "");
  const [location, setLocation] = useState(() =>
    locationDraft(offer, initialStationId),
  );
  const [version, setVersion] = useState(offer?.version);
  const [conflict, setConflict] = useState(false);
  const [latest, setLatest] = useState<Offer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (unavailable) return;
    if (!name.trim()) {
      setError("Enter an offer name.");
      return;
    }
    setError(null);
    setLatest(null);
    setConflict(false);
    setBusy(true);
    try {
      const details = {
        ...parseFacts(facts),
        ...parseLocation(location),
        ...parseContacts(contacts),
      };
      const saved =
        offer && version !== undefined
          ? await repository.rename(offer.id, name, version, details)
          : await repository.create(name, details);
      onSaved(saved);
    } catch (failure) {
      setConflict(
        failure instanceof OfferFailure && failure.kind === "conflict",
      );
      setError(
        failure instanceof OfferFailure
          ? failure.message
          : failure instanceof Error
            ? failure.message
            : "Offer was not saved. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function reviewLatest() {
    if (!offer) return;
    setBusy(true);
    try {
      const current = await repository.get(offer.id);
      if (!current) {
        setError(
          "This offer is no longer available. Your draft has been kept.",
        );
        return;
      }
      setVersion(current.version);
      setLatest(current);
      setConflict(false);
      setError(null);
    } catch {
      setError(
        "Unable to load the latest offer. Your draft has been kept. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={(event) => {
        void save(event);
      }}
    >
      <h2>{offer ? "Edit offer" : "Add offer"}</h2>
      <label>
        Offer name
        <input
          name="offer-name"
          autoFocus
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <OfferLocationFields value={location} onChange={setLocation} />
      <p>Only the name is required. You can add more information later.</p>
      <OfferFactsFields value={facts} onChange={setFacts} />
      <OfferFacilities value={facts} onChange={setFacts} />
      <OfferContactFields value={contacts} onChange={setContacts} />
      {error && <p role="alert">{error}</p>}
      {conflict && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void reviewLatest();
          }}
        >
          Review latest offer
        </button>
      )}
      {latest && (
        <section aria-label="Latest saved facts">
          <p role="status">
            Latest saved name: {latest.name}. Your draft is unchanged.
          </p>
          <OfferFactsSummary offer={latest} />
          <OfferAgentCard offer={latest} />
        </section>
      )}
      {unavailable && (
        <CopyDraftButton
          label="Copy offer draft"
          text={JSON.stringify(
            { name, ...facts, ...location, ...contacts },
            null,
            2,
          )}
        />
      )}
      <div className="offer-actions">
        <button type="submit" disabled={busy || unavailable}>
          {busy ? "Saving…" : "Save offer"}
        </button>
        <button type="button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
