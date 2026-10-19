import { useState } from "react";
import { PhotoImage } from "./PhotoImage";
import { PhotoFailure } from "./repository";
import type { PhotoCollection, PhotosRepository } from "./repository";
export function PhotoOrganizer({
  offerId,
  collection,
  repository,
  uploading,
  onChanged,
}: {
  offerId: string;
  collection: PhotoCollection;
  repository: PhotosRepository;
  uploading: boolean;
  onChanged: (collection: PhotoCollection) => void;
}) {
  const [draft, setDraft] = useState<{
    ids: string[];
    revision: number;
  } | null>(null);
  const [pending, setPending] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const [notice, setNotice] = useState("");
  const busy = pending || uploading;
  const ids = draft?.ids ?? collection.photos.map((photo) => photo.id);
  const stale = draft !== null && draft.revision !== collection.revision;
  function move(id: string, to: number) {
    if (busy || to < 0 || to >= ids.length) return;
    const from = ids.indexOf(id);
    if (from < 0 || from === to) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, id);
    setDraft({ ids: next, revision: draft?.revision ?? collection.revision });
    setError("");
    setNotice("");
  }
  async function mutate(
    action: () => Promise<PhotoCollection>,
    success: string,
  ) {
    if (busy) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const saved = await action();
      onChanged(saved);
      setDraft(null);
      setDeleting(null);
      setConflict(false);
      setNotice(success);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Photo changes failed. Please retry.",
      );
      setConflict(error instanceof PhotoFailure && error.kind === "conflict");
    } finally {
      setPending(false);
    }
  }
  async function reviewLatest() {
    if (busy) return;
    setPending(true);
    try {
      const latest = await repository.snapshot(offerId);
      onChanged(latest);
      if (draft) {
        const current = new Set(latest.photos.map((photo) => photo.id));
        const kept = draft.ids.filter((id) => current.has(id));
        setDraft({
          ids: [
            ...kept,
            ...latest.photos
              .map((photo) => photo.id)
              .filter((id) => !kept.includes(id)),
          ],
          revision: latest.revision,
        });
      }
      setDeleting(null);
      setError("");
      setConflict(false);
      setNotice(
        draft
          ? "Latest photos loaded. Your order is kept; save to apply it."
          : "Latest photos loaded.",
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Photos could not be loaded.",
      );
    } finally {
      setPending(false);
    }
  }
  if (collection.photos.length === 0 && !draft) return null;
  return (
    <details className="photo-organizer">
      <summary>Manage photos</summary>
      <p className="photo-help">
        Drag photos to reorder, or use Earlier and Later. Save the order to
        confirm it. Choose a cover separately.
      </p>
      {error && <p role="alert">{error}</p>}
      {stale && !error && (
        <p role="status">
          Photos changed on another device. Your order is kept; review the
          latest photos before saving.
        </p>
      )}
      {(conflict || stale) && (
        <button
          disabled={busy}
          onClick={() => {
            void reviewLatest();
          }}
        >
          Review latest photos
        </button>
      )}
      <ol className="photo-order-list">
        {ids.map((id, position) => {
          const photo = collection.photos.find((photo) => photo.id === id);
          return (
            <li
              key={id}
              role="group"
              aria-label={`Photo ${position + 1}`}
              draggable={!busy}
              onDragStart={(event) =>
                event.dataTransfer.setData("text/plain", id)
              }
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                move(event.dataTransfer.getData("text/plain"), position);
              }}
            >
              <div className="photo-order-preview">
                {photo ? (
                  <PhotoImage
                    objectKey={photo.objectKey}
                    alt={`Photo ${position + 1} preview`}
                    loading="lazy"
                  />
                ) : (
                  <span>Photo removed on another device</span>
                )}
              </div>
              <div className="photo-order-controls">
                <strong>
                  Photo {position + 1}
                  {collection.coverId === id ? " · Cover" : ""}
                </strong>
                <div>
                  <button
                    disabled={busy || position === 0}
                    aria-label={`Move photo ${position + 1} earlier`}
                    onClick={() => move(id, position - 1)}
                  >
                    Earlier
                  </button>
                  <button
                    disabled={busy || position === ids.length - 1}
                    aria-label={`Move photo ${position + 1} later`}
                    onClick={() => move(id, position + 1)}
                  >
                    Later
                  </button>
                </div>
                <button
                  disabled={busy || draft !== null || !photo}
                  aria-label={`Use photo ${position + 1} as cover`}
                  aria-pressed={collection.coverId === id}
                  onClick={() => {
                    void mutate(
                      () =>
                        repository.chooseCover(
                          offerId,
                          collection.revision,
                          id,
                        ),
                      "Cover photo saved.",
                    );
                  }}
                >
                  {collection.coverId === id ? "Cover" : "Use as cover"}
                </button>
                {deleting === id ? (
                  <div
                    role="group"
                    aria-label={`Delete photo ${position + 1}?`}
                  >
                    <p>Delete this photo permanently?</p>
                    <button
                      disabled={busy}
                      aria-label={`Confirm delete photo ${position + 1}`}
                      onClick={() => {
                        void mutate(
                          () =>
                            repository.remove(offerId, collection.revision, id),
                          "Photo deleted. Storage cleanup is queued.",
                        );
                      }}
                    >
                      Delete photo
                    </button>
                    <button disabled={busy} onClick={() => setDeleting(null)}>
                      Keep photo
                    </button>
                  </div>
                ) : (
                  <button
                    disabled={busy || draft !== null || !photo}
                    aria-label={`Delete photo ${position + 1}`}
                    onClick={() => {
                      setDeleting(id);
                      setNotice("");
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {draft && (
        <div className="photo-order-actions">
          <button
            disabled={busy}
            onClick={() => {
              void mutate(
                () => repository.reorder(offerId, draft.revision, draft.ids),
                "Photo order saved.",
              );
            }}
          >
            Save photo order
          </button>
          <button
            disabled={busy}
            onClick={() => {
              setDraft(null);
              setError("");
              setConflict(false);
              setNotice("");
            }}
          >
            Cancel photo order
          </button>
        </div>
      )}
      {pending && <p role="status">Saving photo changes…</p>}
      {notice && <p role="status">{notice}</p>}
    </details>
  );
}
