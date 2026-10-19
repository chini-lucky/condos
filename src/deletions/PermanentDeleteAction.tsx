import { useState } from "react";
import type { Offer } from "../offers/repository";
import type { DeletionsRepository } from "./repository";
export function PermanentDeleteAction({
  offer,
  repository,
  onDeleted,
}: {
  offer: Offer;
  repository: DeletionsRepository;
  onDeleted: (id: string) => void;
}) {
  const [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  if (!offer.trashedAt) return null;
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await repository.permanentlyDelete(offer.id, offer.version);
      onDeleted(offer.id);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Deletion was not confirmed. Please retry.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section aria-label={`Permanent deletion of ${offer.name}`}>
      {error && <p role="alert">{error}</p>}
      {confirm ? (
        <div role="group" aria-label="Confirm permanent deletion">
          <p>
            Delete “{offer.name}” forever? Its details, notes and photos cannot
            be restored. Photo bytes may take time to finish cleaning up.
          </p>
          <button
            disabled={busy}
            onClick={() => {
              void remove();
            }}
          >
            {busy ? "Deleting…" : "Confirm permanent deletion"}
          </button>
          <button disabled={busy} onClick={() => setConfirm(false)}>
            Cancel permanent deletion
          </button>
        </div>
      ) : (
        <button onClick={() => setConfirm(true)}>Delete permanently</button>
      )}
    </section>
  );
}
