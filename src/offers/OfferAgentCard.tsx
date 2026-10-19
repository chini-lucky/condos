import { useState } from "react";
import {
  lineAction,
  phoneHref,
  sourceHref,
  type OfferContacts,
} from "./contacts";
export function OfferAgentCard({ offer }: { offer: OfferContacts }) {
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const phone = phoneHref(offer.agentPhone);
  const line = lineAction(offer.agentLine);
  const source = sourceHref(offer.sourceUrl);
  async function copy(value: string, label: string) {
    setError("");
    setFeedback("");
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(`${label} copied.`);
    } catch {
      setError(
        `Unable to copy ${label.toLowerCase()}. Select and copy it manually.`,
      );
    }
  }
  return (
    <>
      {source && (
        <p>
          <a href={source} target="_blank" rel="noopener noreferrer">
            Open source listing
          </a>
        </p>
      )}
      <details className="agent-card" role="group" aria-label="Agent contact">
        <summary>
          <span className="agent-initial" aria-hidden="true">
            {offer.agentName?.charAt(0).toUpperCase() || "?"}
          </span>
          <strong>{offer.agentName ?? "Agent details"}</strong>
          <span>{offer.agentCompany ?? "Company unknown"}</span>
        </summary>
        <div className="agent-contact-body">
          <p>
            Phone: <span>{offer.agentPhone ?? "Unknown"}</span>
          </p>
          {phone && offer.agentPhone && (
            <div className="offer-actions">
              <a href={phone} aria-label="Call agent">
                Call
              </a>
              <button
                type="button"
                onClick={() => {
                  if (offer.agentPhone) void copy(offer.agentPhone, "Phone");
                }}
              >
                Copy phone
              </button>
            </div>
          )}
          <p>
            LINE: <span>{offer.agentLine ?? "Unknown"}</span>
          </p>
          {line && offer.agentLine && (
            <>
              <div className="offer-actions">
                <a href={line.href} target="_blank" rel="noopener noreferrer">
                  {line.label}
                </a>
                <button
                  type="button"
                  onClick={() => {
                    if (offer.agentLine) void copy(offer.agentLine, "LINE ID");
                  }}
                >
                  Copy LINE ID
                </button>
              </div>
              {line.help && <p>{line.help}</p>}
            </>
          )}
          {feedback && <p role="status">{feedback}</p>}
          {error && <p role="alert">{error}</p>}
        </div>
      </details>
    </>
  );
}
