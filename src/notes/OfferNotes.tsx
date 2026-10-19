import { useCallback, useEffect, useState } from "react";
import {
  NoteFailure,
  type NotesRepository,
  type OfferNote,
} from "./notesRepository";
import "./notes.css";
const dateFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});
export function OfferNotes({
  offerId,
  repository,
}: {
  offerId: string;
  repository: NotesRepository;
}) {
  const [notes, setNotes] = useState<OfferNote[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refresh = useCallback(async () => {
    try {
      setNotes(await repository.list(offerId));
      setError("");
      return true;
    } catch {
      setError("Unable to load notes. Check your connection and try again.");
      return false;
    } finally {
      setLoading(false);
    }
  }, [offerId, repository]);
  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);
    const focus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", focus);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", focus);
    };
  }, [refresh]);
  async function add(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) {
      setError("Enter a note.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const note = await repository.create(offerId, draft);
      setNotes((current) => [...current, note]);
      setDraft("");
    } catch {
      setError(
        "Note was not saved. Your draft is kept. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="offer-notes" aria-label="Offer notes">
      <h3>Notes ({notes.length})</h3>
      {loading && <p role="status">Loading notes…</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <button
            onClick={() => {
              void refresh();
            }}
          >
            Retry loading notes
          </button>
        </div>
      )}
      {!loading && !notes.length && <p>No notes yet.</p>}
      <ol className="notes-timeline">
        {notes.map((note) => (
          <NoteEntry
            key={note.id}
            note={note}
            repository={repository}
            refresh={refresh}
            onSaved={(saved) =>
              setNotes((current) =>
                current.map((item) => (item.id === saved.id ? saved : item)),
              )
            }
            onRemoved={() =>
              setNotes((current) =>
                current.filter((item) => item.id !== note.id),
              )
            }
          />
        ))}
      </ol>
      <form
        onSubmit={(event) => {
          void add(event);
        }}
      >
        <label>
          New note
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            disabled={busy}
          />
        </label>
        <button disabled={busy || loading} type="submit">
          {busy ? "Adding note…" : "Add note"}
        </button>
      </form>
    </section>
  );
}
function NoteEntry({
  note,
  repository,
  refresh,
  onSaved,
  onRemoved,
}: {
  note: OfferNote;
  repository: NotesRepository;
  refresh: () => Promise<boolean>;
  onSaved: (note: OfferNote) => void;
  onRemoved: () => void;
}) {
  const [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(note.body),
    [snapshot, setSnapshot] = useState(note);
  const [deleting, setDeleting] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [conflict, setConflict] = useState(false),
    [reviewed, setReviewed] = useState(false);
  function cancel() {
    setEditing(false);
    setDeleting(false);
    setError("");
    setConflict(false);
    setReviewed(false);
  }
  async function mutate(remove = false) {
    if (!remove && !draft.trim()) {
      setError("Enter a note.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (remove) {
        await repository.remove(snapshot);
        onRemoved();
      } else {
        onSaved(await repository.edit(snapshot, draft));
        cancel();
      }
    } catch (failure) {
      setConflict(failure instanceof NoteFailure && failure.conflict);
      setError(
        failure instanceof NoteFailure
          ? failure.message
          : "Note was not saved. Your draft is kept. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function review() {
    setBusy(true);
    if (await refresh()) {
      setReviewed(true);
    }
    setBusy(false);
  }
  return (
    <li>
      <time dateTime={note.createdAt}>
        {dateFormat.format(new Date(note.createdAt))} Bangkok
      </time>
      {note.updatedAt !== note.createdAt && (
        <small>
          {" "}
          · Edited {dateFormat.format(new Date(note.updatedAt))} Bangkok
        </small>
      )}
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void mutate();
          }}
        >
          <label>
            Edit note text
            <textarea
              autoFocus
              disabled={busy}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!busy) cancel();
                }
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  if (!busy && !conflict) void mutate();
                }
              }}
            />
          </label>
          <button disabled={busy || conflict} type="submit">
            Save note
          </button>
          <button type="button" disabled={busy} onClick={cancel}>
            Cancel edit
          </button>
        </form>
      ) : (
        <p className="note-body">{note.body}</p>
      )}
      {error && <p role="alert">{error}</p>}
      {conflict && (
        <button
          disabled={busy}
          onClick={() => {
            void review();
          }}
        >
          Review latest notes
        </button>
      )}
      {reviewed && (
        <div>
          <p>Latest saved note: {note.body}. Your draft is unchanged.</p>
          <button
            disabled={busy}
            onClick={() => {
              setSnapshot(note);
              setConflict(false);
              setReviewed(false);
              setError("");
            }}
          >
            Use latest version to retry
          </button>
        </div>
      )}
      {!editing && !deleting && (
        <div className="note-actions">
          <button
            onClick={() => {
              setDraft(note.body);
              setSnapshot(note);
              setEditing(true);
            }}
          >
            Edit note
          </button>
          <button
            onClick={() => {
              setSnapshot(note);
              setDeleting(true);
            }}
          >
            Delete note
          </button>
        </div>
      )}
      {deleting && (
        <div>
          <p>Delete this note?</p>
          <button
            disabled={busy || conflict}
            onClick={() => {
              void mutate(true);
            }}
          >
            Confirm delete note
          </button>
          <button disabled={busy} onClick={cancel}>
            Keep note
          </button>
        </div>
      )}
    </li>
  );
}
