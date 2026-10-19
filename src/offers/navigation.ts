import { stations } from "../rail/network.ts";
export type Route =
  | { kind: "list"; stationId?: string | null }
  | { kind: "add"; stationId?: string | null }
  | { kind: "detail" | "edit"; id: string };
export function parseRoute(hash: string): Route {
  const text = hash.replace(/^#/, "");
  const params = new URLSearchParams(text);
  const id = params.get("offer");
  if (id) return { kind: params.has("edit") ? "edit" : "detail", id };
  if (params.has("add-offer"))
    return { kind: "add", stationId: params.get("station") };
  if (params.has("station"))
    return { kind: "list", stationId: params.get("station") };
  if (text.startsWith("unit-")) return { kind: "detail", id: text.slice(5) };
  if (text.startsWith("edit-")) return { kind: "edit", id: text.slice(5) };
  if (text.startsWith("add-")) return { kind: "add", stationId: text.slice(4) };
  const station = stations.find(
    (station) =>
      station.name.toLowerCase().replace(/[^a-z0-9]/g, "") ===
        text.toLowerCase() || station.id === text,
  );
  return { kind: "list", stationId: station?.id ?? null };
}
export function routeHash(route: Route): string {
  if (route.kind === "list")
    return route.stationId
      ? `#station=${encodeURIComponent(route.stationId)}`
      : "#offers";
  if (route.kind === "add")
    return `#add-offer${route.stationId ? `&station=${encodeURIComponent(route.stationId)}` : ""}`;
  return `#offer=${encodeURIComponent(route.id)}${route.kind === "edit" ? "&edit" : ""}`;
}
export function parentRoute(route: Route, stationId: string | null): Route {
  return route.kind === "edit"
    ? { kind: "detail", id: route.id }
    : { kind: "list", stationId: route.kind === "list" ? null : stationId };
}
export function navigate(route: Route, replace = false): void {
  const hash = routeHash(route);
  if (location.hash === hash) return;
  if (replace) {
    history.replaceState(null, "", hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else location.hash = hash;
}
