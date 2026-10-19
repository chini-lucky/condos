export interface OfferContacts {
  agentName: string | null;
  agentCompany: string | null;
  agentPhone: string | null;
  agentLine: string | null;
  sourceUrl: string | null;
}
export interface ContactsDraft {
  agentName: string;
  agentCompany: string;
  agentPhone: string;
  agentLine: string;
  sourceUrl: string;
}
export function contactsDraft(offer: OfferContacts | null): ContactsDraft {
  return {
    agentName: offer?.agentName ?? "",
    agentCompany: offer?.agentCompany ?? "",
    agentPhone: offer?.agentPhone ?? "",
    agentLine: offer?.agentLine ?? "",
    sourceUrl: offer?.sourceUrl ?? "",
  };
}
export function sourceHref(value: string | null): string | null {
  if (!value || /[\\\s\p{Cc}]/u.test(value)) return null;
  try {
    const url = new URL(value);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      url.username ||
      url.password ||
      !url.hostname
    )
      return null;
    return url.href;
  } catch {
    return null;
  }
}
export function phoneHref(value: string | null): string | null {
  if (!value || !/^\+?[0-9 ()-]{3,40}$/.test(value)) return null;
  const digits = value.replace(/[^0-9]/g, "");
  if (digits.length < 3 || digits.length > 20) return null;
  return `tel:${value.startsWith("+") ? "+" : ""}${digits}`;
}
export function lineAction(
  value: string | null,
): { href: string; label: string; help: string | null } | null {
  if (!value || !/^@?[A-Za-z0-9._-]{1,100}$/.test(value)) return null;
  // LINE documents direct profile URLs for Official Accounts; personal IDs require a search.
  return value.startsWith("@")
    ? {
        href: `https://line.me/R/ti/p/${encodeURIComponent(value)}`,
        label: "Open LINE",
        help: null,
      }
    : {
        href: "https://line.me/R/nv/addFriends",
        label: "Find in LINE",
        help: `Search LINE using this ID: ${value}`,
      };
}
export function parseContacts(draft: ContactsDraft): OfferContacts {
  const contacts = {
    agentName: draft.agentName.trim() || null,
    agentCompany: draft.agentCompany.trim() || null,
    agentPhone: draft.agentPhone.trim() || null,
    agentLine: draft.agentLine.trim() || null,
    sourceUrl: draft.sourceUrl.trim() || null,
  };
  if (contacts.agentPhone && !phoneHref(contacts.agentPhone))
    throw new Error(
      "Enter a phone number using digits, spaces, plus, hyphens or parentheses.",
    );
  if (contacts.agentLine && !lineAction(contacts.agentLine))
    throw new Error("Enter a LINE ID, not a URL.");
  if (contacts.sourceUrl) {
    const href = sourceHref(contacts.sourceUrl);
    if (!href)
      throw new Error(
        "Enter an HTTP or HTTPS source URL without login credentials.",
      );
    contacts.sourceUrl = href;
  }
  return contacts;
}
