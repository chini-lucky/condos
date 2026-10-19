import { useCallback, useEffect, useRef, useState } from "react";
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
  photoId?: string;
};
export function OfferPhotos({ offerId }: { offerId: string }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Selection[]>([]);
  const [busy, setBusy] = useState(false);
  const reservationRequest = useRef<
    { id: string; selection: string } | undefined
  >(undefined);
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
    let entries = selected.filter((entry) => entry.status !== "saved");
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
      if (entries.some((entry) => entry.photoId)) {
        const confirmed = new Set(
          (await repository.list(offerId)).map((photo) => photo.id),
        );
        entries = entries.filter((entry) => {
          if (!entry.photoId || !confirmed.has(entry.photoId)) return true;
          update(entry.id, { status: "saved", error: "" });
          saved++;
          return false;
        });
      }
      if (entries.length > 0) {
        const selection = entries.map((entry) => entry.id).join(":");
        if (reservationRequest.current?.selection !== selection)
          reservationRequest.current = { id: crypto.randomUUID(), selection };
        reservations = await repository.reserve(
          offerId,
          entries.length,
          reservationRequest.current.id,
        );
        reservationRequest.current = undefined;
      }
      for (const [position, entry] of entries.entries()) {
        const reservation = reservations[position];
        if (!reservation)
          throw new Error("Photo reservation missing. Please retry.");
        update(entry.id, {
          status: "uploading",
          error: "",
          photoId: reservation.id,
        });
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
          try {
            if (
              (await repository.list(offerId)).some(
                (photo) => photo.id === reservation.id,
              )
            ) {
              update(entry.id, { status: "saved", error: "" });
              saved++;
              continue;
            }
          } catch {
            /* Keep the reservation identity until access returns. */
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
              setError("");
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
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ready"; photo: Photo | null }
    | { kind: "error" }
  >({ kind: "loading" });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    if (repository)
      void repository
        .list(offerId)
        .then((photos) => {
          if (active) setState({ kind: "ready", photo: photos[0] ?? null });
        })
        .catch(() => {
          if (active) setState({ kind: "error" });
        });
    return () => {
      active = false;
    };
  }, [offerId, retry]);
  return (
    <div className="offer-cover">
      {state.kind === "ready" && state.photo ? (
        <PhotoImage
          key={state.photo.id}
          objectKey={state.photo.objectKey}
          alt={`${name} cover photo`}
        />
      ) : (
        <div
          className="photo-placeholder"
          aria-label={`${name}: ${state.kind === "loading" ? "loading photo" : state.kind === "error" ? "photo unavailable" : "no photo"}`}
        >
          {state.kind === "loading" ? (
            "Loading photo…"
          ) : state.kind === "error" ? (
            <>
              <p>Photo unavailable</p>
              <button onClick={() => setRetry((value) => value + 1)}>
                Retry cover photo
              </button>
            </>
          ) : (
            "No photo"
          )}
        </div>
      )}
    </div>
  );
}
