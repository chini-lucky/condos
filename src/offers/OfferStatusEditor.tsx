import { useState } from "react";
import {
  appointmentInput,
  appointmentInstant,
  formatAppointment,
} from "./appointments";
import { OfferFailure } from "./repository";
import type { Offer, OffersRepository } from "./repository";
export function OfferStatusEditor({
  offer,
  repository,
  onSaved,
}: {
  offer: Offer;
  repository: OffersRepository;
  onSaved: (offer: Offer) => void;
}) {
  const [open, setOpen] = useState(false);
  return open ? (
    <StatusForm
      key={offer.id}
      offer={offer}
      repository={repository}
      onSaved={(saved) => {
        setOpen(false);
        onSaved(saved);
      }}
      onCancel={() => setOpen(false)}
    />
  ) : (
    <button onClick={() => setOpen(true)}>Change status or viewing</button>
  );
}
function StatusForm({
  offer,
  repository,
  onSaved,
  onCancel,
}: {
  offer: Offer;
  repository: OffersRepository;
  onSaved: (offer: Offer) => void;
  onCancel: () => void;
}) {
  const [status, setStatus] = useState(offer.status),
    [pending, setPending] = useState(offer.pendingExplanation ?? ""),
    [reason, setReason] = useState(offer.rejectionReason ?? ""),
    [time, setTime] = useState(appointmentInput(offer.viewingAt)),
    [version, setVersion] = useState(offer.version);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [conflict, setConflict] = useState(false),
    [latest, setLatest] = useState<Offer | null>(null);
  async function save(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    setConflict(false);
    setLatest(null);
    try {
      onSaved(
        await repository.updateStatus(offer.id, version, {
          status,
          pendingExplanation: pending.trim() || null,
          rejectionReason: reason.trim() || null,
          viewingAt: appointmentInstant(time),
        }),
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Status was not saved. Please try again.",
      );
      setConflict(
        failure instanceof OfferFailure && failure.kind === "conflict",
      );
    } finally {
      setBusy(false);
    }
  }
  async function review() {
    setBusy(true);
    try {
      const current = await repository.get(offer.id);
      if (!current) throw new Error("Offer unavailable. Your draft is kept.");
      setVersion(current.version);
      setLatest(current);
      setConflict(false);
      setError("");
    } catch {
      setError(
        "Unable to load latest offer. Your draft is kept. Please try again.",
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
      aria-label="Status and viewing"
    >
      <h3>Status and viewing</h3>
      <label>
        Offer status
        <select
          value={status}
          onChange={(event) => {
            const value = event.target.value;
            if (
              value === "Pending" ||
              value === "Available" ||
              value === "Viewing" ||
              value === "Rejected"
            )
              setStatus(value);
          }}
        >
          <option>Pending</option>
          <option>Available</option>
          <option>Viewing</option>
          <option>Rejected</option>
        </select>
      </label>
      <p>
        Available: agent-confirmed. Viewing: arranged. Rejected: ruled out or
        unavailable.
      </p>
      {status === "Pending" && (
        <label>
          Waiting on
          <textarea
            value={pending}
            onChange={(event) => setPending(event.target.value)}
          />
        </label>
      )}
      {status === "Rejected" && (
        <label>
          Rejection reason
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
      )}
      <label>
        Viewing time (Bangkok)
        <input
          type="datetime-local"
          value={time}
          onChange={(event) => setTime(event.target.value)}
        />
      </label>
      <button type="button" disabled={busy} onClick={() => setTime("")}>
        Clear viewing time
      </button>
      <p>
        Optional. Dates use Asia/Bangkok. Past appointments do not change
        status.
      </p>
      {error && <p role="alert">{error}</p>}
      {conflict && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            void review();
          }}
        >
          Review latest status
        </button>
      )}
      {latest && (
        <p role="status">
          Latest saved status: {latest.status}. Viewing:{" "}
          {latest.viewingAt
            ? formatAppointment(latest.viewingAt)
            : "not arranged"}
          . Waiting on: {latest.pendingExplanation ?? "not recorded"}. Rejection
          reason: {latest.rejectionReason ?? "not recorded"}. Your draft is
          unchanged.
        </p>
      )}
      <div className="offer-actions">
        <button disabled={busy} type="submit">
          {busy ? "Saving status…" : "Save status and viewing"}
        </button>
        <button type="button" disabled={busy} onClick={onCancel}>
          Cancel status edit
        </button>
      </div>
    </form>
  );
}
