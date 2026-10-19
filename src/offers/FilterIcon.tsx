import type { FacilityName, PropertyType } from "./facts";
/** Small outline symbols follow the approved design's facility and property vocabulary. */
export function FilterIcon({ name }: { name: FacilityName | PropertyType }) {
  const paths = {
    washer: "M2.5 4.5h11M6 10c1 1 3-1 4 0",
    garden:
      "M8 14V7M8 9C8 5 5.5 3 2.5 3c0 3.5 2 6 5.5 6Zm0 1.5c0-3 2-5 5.5-5 0 3-2 5-5.5 5ZM4.5 14h7",
    pool: "M5 11V4a1.5 1.5 0 0 1 3 0v7M11 11V4a1.5 1.5 0 0 0-3 0M5 6.5h6M5 9h6M1.5 13c1 1 2 1 3 0s2-1 3 0 2 1 3 0 2-1 4 0",
    microwave: "M3.5 5h6v6h-6zM12 5v1M12 9v2M5 7c1-1 2 1 3 0M5 9c1-1 2 1 3 0",
    condominium:
      "M3 14V2h10v12M1.5 14h13M6 14v-3h4v3M5.5 5h1M9.5 5h1M5.5 8h1M9.5 8h1",
    townhouse: "m1.5 7 6.5-5.5L14.5 7M3.5 6v8h9V6M6.5 14v-4h3v4",
  };
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
      {name === "washer" && (
        <>
          <rect x="2" y="1.5" width="12" height="13" rx="2" />
          <circle cx="8" cy="9.5" r="3" />
        </>
      )}
      {name === "microwave" && (
        <rect x="1.5" y="2.5" width="13" height="11" rx="2" />
      )}
    </svg>
  );
}
