import type { SupabaseClient } from "@supabase/supabase-js";
import type { OfferContacts } from "./contacts";
import type { OfferFacts } from "./facts";
import type { OfferLocation } from "./location";
export interface OfferDetails
  extends Partial<OfferFacts>, Partial<OfferLocation>, Partial<OfferContacts> {}
export interface Offer extends OfferFacts, OfferLocation, OfferContacts {
  id: string;
  name: string;
  status: "Pending" | "Available" | "Viewing" | "Rejected";
  pendingExplanation: string | null;
  rejectionReason: string | null;
  viewingAt: string | null;
  version: number;
  trashedAt: string | null;
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
  const nullableString = (key: string): string | null => {
    const value = field(key);
    if (value === null || typeof value === "string") return value;
    throw new Error("Invalid offer contact");
  };
  const nullableNumber = (key: string): number | null => {
    const value = field(key);
    if (value === null || (typeof value === "number" && Number.isFinite(value)))
      return value;
    throw new Error("Invalid numeric offer fact");
  };
  const nullableBoolean = (key: string): boolean | null => {
    const value = field(key);
    if (value === null || typeof value === "boolean") return value;
    throw new Error("Invalid offer facility");
  };
  const propertyType = field("property_type");
  const extraFacilities = field("extra_facilities");
  if (
    propertyType !== null &&
    propertyType !== "condominium" &&
    propertyType !== "townhouse"
  )
    throw new Error("Invalid property type");
  if (
    !Array.isArray(extraFacilities) ||
    !extraFacilities.every(
      (value): value is string => typeof value === "string",
    )
  )
    throw new Error("Invalid extra facilities");
  const pendingExplanation = field("pending_explanation"),
    rejectionReason = field("rejection_reason"),
    viewingAt = field("viewing_at");
  if (
    (pendingExplanation !== null && typeof pendingExplanation !== "string") ||
    (rejectionReason !== null && typeof rejectionReason !== "string") ||
    (viewingAt !== null && typeof viewingAt !== "string")
  )
    throw new Error("Invalid offer response");
  if (viewingAt !== null && !Number.isFinite(Date.parse(viewingAt)))
    throw new Error("Invalid appointment response");
  return {
    id,
    name,
    status,
    pendingExplanation,
    rejectionReason,
    viewingAt,
    version,
    createdAt,
    updatedAt,
    stationId,
    walkingMetres,
    bearing,
    trashedAt: nullableString("trashed_at"),
    agentName: nullableString("agent_name"),
    agentCompany: nullableString("agent_company"),
    agentPhone: nullableString("agent_phone"),
    agentLine: nullableString("agent_line"),
    sourceUrl: nullableString("source_url"),
    propertyType,
    extraFacilities,
    rent: nullableNumber("rent"),
    sizeSqm: nullableNumber("size_sqm"),
    beds: nullableNumber("beds"),
    floor: nullableNumber("floor"),
    washer: nullableBoolean("washer"),
    garden: nullableBoolean("garden"),
    pool: nullableBoolean("pool"),
    microwave: nullableBoolean("microwave"),
  };
}
function detailsPatch(facts: OfferDetails) {
  return Object.fromEntries(
    Object.entries({
      station_id: facts.stationId,
      walking_metres: facts.walkingMetres,
      bearing: facts.bearing,
      agent_name: facts.agentName,
      agent_company: facts.agentCompany,
      agent_phone: facts.agentPhone,
      agent_line: facts.agentLine,
      source_url: facts.sourceUrl,
      rent: facts.rent,
      property_type: facts.propertyType,
      size_sqm: facts.sizeSqm,
      beds: facts.beds,
      floor: facts.floor,
      washer: facts.washer,
      garden: facts.garden,
      pool: facts.pool,
      microwave: facts.microwave,
      extra_facilities: facts.extraFacilities,
    }).filter(([, value]) => value !== undefined),
  );
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
    async list(scope: "active" | "trash" | "all" = "active"): Promise<Offer[]> {
      let query = client
        .from("offers")
        .select("*")
        .order("created_at", { ascending: false });
      if (scope === "active") query = query.is("trashed_at", null);
      if (scope === "trash") query = query.not("trashed_at", "is", null);
      const result = await query;
      if (result.error)
        throw new OfferFailure(
          "unavailable",
          "Unable to load offers. Check your connection and try again.",
        );
      const data: unknown = result.data;
      if (!Array.isArray(data)) throw new Error("Invalid offer list");
      return data.map(decode);
    },
    async trash(id: string, version: number): Promise<Offer> {
      return changeTrash(client, "trash_offer", id, version);
    },
    async restore(id: string, version: number): Promise<Offer> {
      return changeTrash(client, "restore_offer", id, version);
    },
    async create(name: string, facts: OfferDetails = {}): Promise<Offer> {
      const result = await client.rpc("create_offer_details", {
        p_name: name,
        p_patch: detailsPatch(facts),
      });
      if (result.error)
        throw new OfferFailure(
          "unavailable",
          "Offer was not saved. Check your connection and try again.",
        );
      return decode(result.data);
    },
    async updateStatus(
      id: string,
      version: number,
      values: {
        status: Offer["status"];
        pendingExplanation: string | null;
        rejectionReason: string | null;
        viewingAt: string | null;
      },
    ): Promise<Offer> {
      const result = await client.rpc("update_offer_status", {
        p_id: id,
        p_expected_version: version,
        p_status: values.status,
        p_pending_explanation: values.pendingExplanation,
        p_rejection_reason: values.rejectionReason,
        p_viewing_at: values.viewingAt,
      });
      if (result.error)
        throw new OfferFailure(
          result.error.code === "40001" ? "conflict" : "unavailable",
          result.error.code === "40001"
            ? "This offer changed on another device. Your draft is kept. Review the latest offer before retrying."
            : "Status was not saved. Check your connection and try again.",
        );
      return decode(result.data);
    },
    async rename(
      id: string,
      name: string,
      version: number,
      facts: OfferDetails = {},
    ): Promise<Offer> {
      const result = await client.rpc("save_offer", {
        p_patch: detailsPatch(facts),
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

async function changeTrash(
  client: SupabaseClient,
  operation: "trash_offer" | "restore_offer",
  id: string,
  version: number,
): Promise<Offer> {
  const result = await client.rpc(operation, {
    p_id: id,
    p_expected_version: version,
  });
  if (result.error)
    throw new OfferFailure(
      result.error.code === "40001" ? "conflict" : "unavailable",
      result.error.code === "40001"
        ? "This offer changed on another device. Reload the latest offer before trying again."
        : "Trash was not updated. Check your connection and try again.",
    );
  return decode(result.data);
}
