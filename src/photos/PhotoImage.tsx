import { useEffect, useState } from "react";
import { supabase } from "../auth";
import { photosRepository } from "./repository";
const repository = supabase ? photosRepository(supabase) : null;
export function PhotoImage({
  objectKey,
  alt,
}: {
  objectKey: string;
  alt: string;
}) {
  const [source, setSource] = useState<string>();
  const [error, setError] = useState("");
  const [renewal, setRenewal] = useState(0);
  const [imageRetries, setImageRetries] = useState(0);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (repository)
      void repository
        .signedUrl(objectKey)
        .then((link) => {
          if (!active) return;
          setSource(link.url);
          setError("");
          timer = setTimeout(
            () => setRenewal((value) => value + 1),
            Math.max(1000, link.expiresAt - Date.now() - 30_000),
          );
        })
        .catch((error) => {
          if (active)
            setError(
              error instanceof Error ? error.message : "Photo unavailable",
            );
        });
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [objectKey, renewal]);
  if (error)
    return (
      <div className="photo-placeholder" role="status">
        <p>{error}</p>
        <button
          onClick={() => {
            setImageRetries(0);
            setRenewal((value) => value + 1);
          }}
        >
          Retry photo
        </button>
      </div>
    );
  return source ? (
    <img
      className="offer-photo"
      src={source}
      alt={alt}
      onError={() => {
        if (imageRetries < 1) {
          setImageRetries((value) => value + 1);
          setRenewal((value) => value + 1);
        } else setError("This photo could not be displayed. Please retry.");
      }}
    />
  ) : (
    <div className="photo-placeholder" role="status">
      Loading photo…
    </div>
  );
}
