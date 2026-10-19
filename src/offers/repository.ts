import type { SupabaseClient } from "@supabase/supabase-js";
export interface Offer {
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
    updatedAt = field("updated_at");
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
    typeof updatedAt !== "string"
  )
    throw new Error("Invalid offer response");
  return { id, name, status, version, createdAt, updatedAt };
}
export function offersRepository(client: SupabaseClient) {
  return {
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
    async create(name: string): Promise<Offer> {
      const result = await client.rpc("create_offer", { p_name: name });
      if (result.error)
        throw new OfferFailure(
          "unavailable",
          "Offer was not saved. Check your connection and try again.",
        );
      return decode(result.data);
    },
    async rename(id: string, name: string, version: number): Promise<Offer> {
      const result = await client.rpc("rename_offer", {
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
