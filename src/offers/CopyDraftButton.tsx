import { useState } from "react";
export function CopyDraftButton({
  label,
  text,
}: {
  label: string;
  text: string;
}) {
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFeedback("");
          setError("");
          void navigator.clipboard
            .writeText(text)
            .then(() => setFeedback("Draft copied."))
            .catch(() =>
              setError(
                "Unable to copy. Select the draft text and copy it manually before leaving.",
              ),
            );
        }}
      >
        {label}
      </button>
      {feedback && <p role="status">{feedback}</p>}
      {error && <p role="alert">{error}</p>}
    </>
  );
}
