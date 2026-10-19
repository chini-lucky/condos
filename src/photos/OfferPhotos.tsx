import { useCallback, useEffect, useState } from "react";
import { supabase } from "../auth";
import { maximumPhotoBytes, processPhoto } from "./process";
import { photosRepository } from "./repository";
import type { Photo } from "./repository";
import { PhotoImage } from "./PhotoImage";
import "./photos.css";
const repository = supabase ? photosRepository(supabase) : null;
type Selection = {
  id: string;
  file: File;
  status: "selected" | "uploading" | "saved" | "failed";
  error: string;
};
export function OfferPhotos({ offerId }: { offerId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Selection[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [cleanup, setCleanup] = useState<{ pending: number; failed: number }>();
  const refresh = useCallback(async () => {
    if (!repository) return;
    try {
      setPhotos(await repository.list(offerId));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Photos unavailable");
    } finally {
      setLoading(false);
    }
    try {
      setCleanup(await repository.cleanupStatus());
    } catch {
      /* Attachment reads remain available if cleanup status is offline. */
    }
  }, [offerId]);
  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);
  const current = photos[Math.min(index, Math.max(0, photos.length - 1))];
  async function uploadSelected() {
    if (!repository || busy) return;
    const entries = selected.filter((entry) => entry.status !== "saved");
    if (entries.length === 0) return;
    setBusy(true);
    setError("");
    setNotice("");
    let reservations: Photo[] = [];
    let saved = 0;
    const update = (id: string, patch: Partial<Selection>) =>
      setSelected((current) =>
        current.map((entry) =>
          entry.id === id ? { ...entry, ...patch } : entry,
        ),
      );
    try {
      reservations = await repository.reserve(
        offerId,
        entries.length,
        crypto.randomUUID(),
      );
      for (const [position, entry] of entries.entries()) {
        const reservation = reservations[position];
        if (!reservation)
          throw new Error("Photo reservation missing. Please retry.");
        update(entry.id, { status: "uploading", error: "" });
        try {
          const jpeg = await processPhoto(entry.file);
          await repository.upload(reservation, jpeg);
          update(entry.id, { status: "saved" });
          saved++;
        } catch (error) {
          let message =
            error instanceof Error
              ? error.message
              : "Photo failed. Please retry.";
          try {
            await repository.cancel([reservation.id]);
          } catch (cleanupError) {
            message += ` ${cleanupError instanceof Error ? cleanupError.message : "Cleanup is pending."}`;
          }
          update(entry.id, { status: "failed", error: message });
        }
      }
      setNotice(`${saved} ${saved === 1 ? "photo" : "photos"} saved.`);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Photos could not be uploaded. Please retry.",
      );
      if (reservations.length > 0)
        try {
          await repository.cancel(reservations.map((photo) => photo.id));
        } catch {
          setError(
            "Upload stopped. Cleanup is pending and will be retried automatically.",
          );
        }
    } finally {
      setBusy(false);
      await refresh();
    }
  }
  return (
    <section className="offer-photos" aria-label="Offer photos">
      <h3>
        Photos <span>{photos.length}/20</span>
      </h3>
      {loading ? (
        <p role="status">Loading photos…</p>
      ) : current ? (
        <div className="photo-carousel" aria-roledescription="carousel">
          <PhotoImage
            key={current.id}
            objectKey={current.objectKey}
            alt={`Offer photo ${Math.min(index, photos.length - 1) + 1} of ${photos.length}`}
          />
          <div className="photo-dots" aria-label="Photo navigation">
            {photos.map((photo, position) => (
              <button
                key={photo.id}
                aria-label={`Show photo ${position + 1}`}
                aria-pressed={current.id === photo.id}
                onClick={() => setIndex(position)}
              >
                <span aria-hidden="true">●</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="photo-placeholder">No photos yet</div>
      )}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            onClick={() => {
              void refresh();
            }}
          >
            Retry loading photos
          </button>
        </div>
      )}
      <label>
        Choose photos
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={busy}
          onChange={(event) => {
            const files = Array.from(event.currentTarget.files ?? []);
            setNotice("");
            setSelected((current) => [
              ...current.filter((entry) => entry.status !== "saved"),
              ...files.map((file) => ({
                id: crypto.randomUUID(),
                file,
                status: "selected" as const,
                error:
                  file.size > maximumPhotoBytes
                    ? "Each source photo must be 10 MB or smaller."
                    : "",
              })),
            ]);
            event.currentTarget.value = "";
          }}
        />
      </label>
      <p className="photo-help">
        Optional · JPEG, PNG or WebP · up to 10 MB each · 20 photos per offer
      </p>
      {selected.length > 0 && (
        <ul className="photo-upload-list">
          {selected.map((entry) => (
            <li key={entry.id}>
              <span>{entry.file.name}</span>{" "}
              <span>
                {entry.status === "uploading"
                  ? "Converting and uploading…"
                  : entry.status === "saved"
                    ? "Saved"
                    : entry.status === "failed"
                      ? "Failed"
                      : "Selected"}
              </span>
              {entry.error && <p role="alert">{entry.error}</p>}
              {entry.status !== "saved" && !busy && (
                <button
                  aria-label={`Remove selected ${entry.file.name}`}
                  onClick={() =>
                    setSelected((current) =>
                      current.filter((item) => item.id !== entry.id),
                    )
                  }
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {selected.some((entry) => entry.status !== "saved") && (
        <button
          disabled={busy}
          onClick={() => {
            void uploadSelected();
          }}
        >
          {busy
            ? "Uploading photos…"
            : selected.some((entry) => entry.status === "failed")
              ? "Retry failed photos"
              : "Upload selected photos"}
        </button>
      )}
      {notice && <p role="status">{notice}</p>}
      {cleanup && cleanup.pending > 0 && (
        <div className="photo-cleanup" role="status">
          <p>
            {cleanup.pending} photo cleanup{" "}
            {cleanup.pending === 1 ? "job" : "jobs"} pending
            {cleanup.failed > 0 ? `; ${cleanup.failed} awaiting retry` : ""}.
          </p>
          <button
            disabled={busy}
            onClick={() => {
              if (repository)
                void repository
                  .retryCleanup()
                  .then(refresh)
                  .catch((error) =>
                    setError(
                      error instanceof Error
                        ? error.message
                        : "Cleanup retry failed",
                    ),
                  );
            }}
          >
            Retry photo cleanup
          </button>
        </div>
      )}
    </section>
  );
}
export function OfferCover({
  offerId,
  name,
}: {
  offerId: string;
  name: string;
}) {
  const [photo, setPhoto] = useState<Photo>();
  useEffect(() => {
    let active = true;
    if (repository)
      void repository
        .list(offerId)
        .then((photos) => {
          if (active) setPhoto(photos[0]);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [offerId]);
  return (
    <div className="offer-cover">
      {photo ? (
        <PhotoImage
          key={photo.id}
          objectKey={photo.objectKey}
          alt={`${name} cover photo`}
        />
      ) : (
        <div className="photo-placeholder" aria-label={`${name}: no photo`}>
          No photo
        </div>
      )}
    </div>
  );
}
