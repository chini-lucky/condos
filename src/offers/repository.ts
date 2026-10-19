import type { SupabaseClient } from "@supabase/supabase-js";
import type { OfferLocation } from "./location";
export interface OfferDetails {
  stationId?: string | null;
  walkingMetres?: number | null;
  bearing?: number | null;
}
function locationPatch(details: OfferDetails) {
  return {
    ...("stationId" in details ? { station_id: details.stationId } : {}),
    ...("walkingMetres" in details
      ? { walking_metres: details.walkingMetres }
      : {}),
    ...("bearing" in details ? { bearing: details.bearing } : {}),
  };
}
export interface Offer extends OfferLocation {
  id: string;
  name: string;
  status: "Pending" | "Available" | "Viewing" | "Rejected";
  version: number;
  createdAt: string;
  updatedAt: string;
}
export class OfferFailure extends Error {
  constructor(
    public readonly kind: "conflict" | "unavailable",
    message: string,
  ) {
    super(message);
  }
}
function decode(value: unknown): Offer {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid offer response");
  const field = (name: string): unknown =>
    Object.getOwnPropertyDescriptor(value, name)?.value;
  const id = field("id"),
    name = field("name"),
    status = field("status"),
    version = field("version"),
    createdAt = field("created_at"),
    updatedAt = field("updated_at"),
    stationId = field("station_id"),
    walkingMetres = field("walking_metres"),
    bearing = field("bearing");
  if (
    typeof id !== "string" ||
    typeof name !== "string" ||
    (status !== "Pending" &&
      status !== "Available" &&
      status !== "Viewing" &&
      status !== "Rejected") ||
    typeof version !== "number" ||
    !Number.isSafeInteger(version) ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string" ||
    (stationId !== null && typeof stationId !== "string") ||
    (walkingMetres !== null &&
      (typeof walkingMetres !== "number" ||
        !Number.isFinite(walkingMetres) ||
        walkingMetres < 0)) ||
    (bearing !== null &&
      (typeof bearing !== "number" ||
        !Number.isFinite(bearing) ||
        bearing < 0 ||
        bearing >= 360))
  )
    throw new Error("Invalid offer response");
  return {
    id,
    name,
    status,
    version,
    createdAt,
    updatedAt,
    stationId,
    walkingMetres,
    bearing,
  };
}
export function offersRepository(client: SupabaseClient) {
  return {
    async get(id: string): Promise<Offer | null> {
      const result = await client
        .from("offers")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (result.error)
        throw new OfferFailure(
          "unavailable",
          "Unable to load the latest offer. Please try again.",
        );
      return result.data ? decode(result.data) : null;
    },
    async list(): Promise<Offer[]> {
      const result = await client
        .from("offers")
        .select("*")
        .order("created_at", { ascending: false });
      if (result.error)
        throw new OfferFailure(
          "unavailable",
          "Unable to load offers. Check your connection and try again.",
        );
      const data: unknown = result.data;
      if (!Array.isArray(data)) throw new Error("Invalid offer list");
      return data.map(decode);
    },
    async create(name: string, details?: OfferDetails): Promise<Offer> {
      const result = details
        ? await client.rpc("create_offer_details", {
            p_name: name,
            p_patch: locationPatch(details),
          })
        : await client.rpc("create_offer", { p_name: name });
      if (result.error)
        throw new OfferFailure(
          "unavailable",
          "Offer was not saved. Check your connection and try again.",
        );
      return decode(result.data);
    },
    async rename(
      id: string,
      name: string,
      version: number,
      details?: OfferDetails,
    ): Promise<Offer> {
      const result = details
        ? await client.rpc("save_offer", {
            p_id: id,
            p_name: name,
            p_expected_version: version,
            p_patch: locationPatch(details),
          })
        : await client.rpc("rename_offer", {
            p_id: id,
            p_name: name,
            p_expected_version: version,
          });
      if (result.error)
        throw new OfferFailure(
          result.error.code === "40001" ? "conflict" : "unavailable",
          result.error.code === "40001"
            ? "This offer changed on another device or is no longer available. Your edit has been kept. Reload the latest offer before trying again."
            : "Offer was not saved. Check your connection and try again.",
        );
      return decode(result.data);
    },
  };
}
export type OffersRepository = ReturnType<typeof offersRepository>;
