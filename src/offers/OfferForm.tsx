import { useState } from "react";
import type { Offer, OffersRepository } from "./repository";
import { OfferFailure } from "./repository";
import {
  OfferLocationFields,
  locationDraft,
  parseLocation,
} from "./OfferLocationFields";
export function OfferForm({
  offer,
  repository,
  onSaved,
  onCancel,
  initialStationId,
}: {
  offer: Offer | null;
  repository: OffersRepository;
  onSaved: (offer: Offer) => void;
  onCancel: () => void;
  initialStationId?: string | undefined;
}) {
  const [name, setName] = useState(offer?.name ?? "");
  const [location, setLocation] = useState(() =>
    locationDraft(offer, initialStationId),
  );
  const [version, setVersion] = useState(offer?.version);
  const [conflict, setConflict] = useState(false);
  const [latest, setLatest] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter an offer name.");
      return;
    }
    setError(null);
    setLatest(null);
    setConflict(false);
    setBusy(true);
    try {
      const details = parseLocation(location);
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
      setLatest(current.name);
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
        <p role="status">
          Latest saved name: {latest}. Your draft is unchanged.
        </p>
      )}
      <div className="offer-actions">
        <button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save offer"}
        </button>
        <button type="button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
