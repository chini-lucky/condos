import { useEffect, useState } from "react";
import type { DeletionReceipt, DeletionsRepository } from "./repository";
export function DeletionCleanupStatus({
  repository,
}: {
  repository: DeletionsRepository;
}) {
  const [receipts, setReceipts] = useState<DeletionReceipt[]>([]),
    [error, setError] = useState(""),
    [retry, setRetry] = useState(0),
    [busy, setBusy] = useState<string | null>(null),
    [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    async function load() {
      try {
        const rows = await repository.list();
        if (active) {
          setReceipts(rows);
          setLoading(false);
          setError("");
          // A late upload can reopen a completed tombstone's cleanup job.
          timer = setTimeout(() => {
            void load();
          }, 10000);
        }
      } catch {
        if (active) {
          setLoading(false);
          setError(
            "Deletion cleanup status could not be loaded. Please retry.",
          );
        }
      }
    }
    void load();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [repository, retry]);
  async function retryCleanup(id: string) {
    setBusy(id);
    setError("");
    try {
      await repository.retryCleanup(id);
      setRetry((value) => value + 1);
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Cleanup retry failed. The offer remains deleted.",
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <section aria-label="Permanent deletion cleanup">
      <h3>Permanent deletion cleanup</h3>
      {loading && <p role="status">Loading deletion cleanup…</p>}
      {error && <p role="alert">{error}</p>}
      <button onClick={() => setRetry((value) => value + 1)}>
        Refresh deletion cleanup
      </button>
      {receipts.map((receipt) => (
        <article key={receipt.offerId}>
          <h4>{receipt.name}</h4>
          <p>
            {receipt.pending === 0
              ? "Cleanup complete"
              : `${receipt.pending} photo cleanup jobs pending${receipt.failed > 0 ? `; ${receipt.failed} awaiting retry` : ""}`}
            . The offer is permanently deleted.
          </p>
          {receipt.pending > 0 && (
            <button
              disabled={busy !== null}
              onClick={() => {
                void retryCleanup(receipt.offerId);
              }}
            >
              {busy === receipt.offerId
                ? "Retrying cleanup…"
                : `Retry cleanup for ${receipt.name}`}
            </button>
          )}
        </article>
      ))}
    </section>
  );
}
