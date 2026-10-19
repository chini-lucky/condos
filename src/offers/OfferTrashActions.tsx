import { useState } from "react";
import type { Offer, OffersRepository } from "./repository";
export function OfferTrashActions({
  offer,
  repository,
  onChanged,
}: {
  offer: Offer;
  repository: OffersRepository;
  onChanged: (offer: Offer) => void;
}) {
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function change() {
    setBusy(true);
    setError("");
    try {
      onChanged(
        await (offer.trashedAt
          ? repository.restore(offer.id, offer.version)
          : repository.trash(offer.id, offer.version)),
      );
      setConfirm(false);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Unable to change Trash. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label="Offer recovery">
      {error && <p role="alert">{error}</p>}
      {offer.trashedAt ? (
        <button
          disabled={busy}
          onClick={() => {
            void change();
          }}
        >
          {busy ? "Restoring…" : "Restore offer"}
        </button>
      ) : confirm ? (
        <div role="group" aria-label="Confirm move to Trash">
          <p>
            Move this offer to Trash? Its information, notes and photos will be
            kept until you restore or permanently delete it.
          </p>
          <button
            disabled={busy}
            onClick={() => {
              void change();
            }}
          >
            {busy ? "Moving…" : "Confirm move to Trash"}
          </button>
          <button disabled={busy} onClick={() => setConfirm(false)}>
            Cancel move to Trash
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirm(true)}>Move to Trash</button>
      )}
    </section>
  );
}
