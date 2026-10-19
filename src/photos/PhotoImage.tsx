import { useEffect, useState } from "react";
import { supabase } from "../auth";
import { photosRepository } from "./repository";
const repository = supabase ? photosRepository(supabase) : null;
export function PhotoImage({
  objectKey,
  alt,
  loading = "eager",
}: {
  objectKey: string;
  alt: string;
  loading?: "eager" | "lazy";
}) {
  const [source, setSource] = useState<{ url: string; generation: number }>();
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
          setSource({ url: link.url, generation: renewal });
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
      loading={loading}
      key={source.generation}
      src={source.url}
      onLoad={() => setImageRetries(0)}
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
