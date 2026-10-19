import type { ContactsDraft } from "./contacts";
export function OfferContactFields({
  value,
  onChange,
}: {
  value: ContactsDraft;
  onChange: (value: ContactsDraft) => void;
}) {
  return (
    <fieldset>
      <legend>Agent and source (optional)</legend>
      {(
        [
          ["agentName", "Agent name", "text"],
          ["agentCompany", "Agent company", "text"],
          ["agentPhone", "Agent phone", "tel"],
          ["agentLine", "Agent LINE ID", "text"],
          ["sourceUrl", "Source URL", "url"],
        ] as const
      ).map(([key, label, type]) => (
        <label key={key}>
          {label}
          <input
            type={type}
            value={value[key]}
            onChange={(event) =>
              onChange({ ...value, [key]: event.target.value })
            }
          />
        </label>
      ))}
      <p>
        Use a LINE ID, such as pim.homes or @pim.homes. These details belong
        only to this offer.
      </p>
    </fieldset>
  );
}
