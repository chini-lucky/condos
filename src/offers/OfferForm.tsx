import { useState } from "react";
import type { Offer, OffersRepository } from "./repository";
import { OfferFailure } from "./repository";
export function OfferForm({
  offer,
  repository,
  onSaved,
  onCancel,
}: {
  offer: Offer | null;
  repository: OffersRepository;
  onSaved: (offer: Offer) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(offer?.name ?? "");
  const [version] = useState(offer?.version);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      setError("Enter an offer name.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const saved =
        offer && version !== undefined
          ? await repository.rename(offer.id, name, version)
          : await repository.create(name);
      onSaved(saved);
    } catch (failure) {
      setError(
        failure instanceof OfferFailure
          ? failure.message
          : "Offer was not saved. Please try again.",
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
      <p>Only the name is required. You can add more information later.</p>
      {error && <p role="alert">{error}</p>}
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
