import type { SupabaseClient } from "@supabase/supabase-js";
export interface OfferNote {
  id: string;
  offerId: string;
  body: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}
export class NoteFailure extends Error {
  constructor(
    public readonly conflict: boolean,
    message: string,
  ) {
    super(message);
  }
}
function decode(value: unknown): OfferNote {
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid note response");
  const field = (name: string): unknown =>
    Object.getOwnPropertyDescriptor(value, name)?.value;
  const id = field("id"),
    offerId = field("offer_id"),
    body = field("body"),
    version = field("version"),
    createdAt = field("created_at"),
    updatedAt = field("updated_at");
  if (
    typeof id !== "string" ||
    typeof offerId !== "string" ||
    typeof body !== "string" ||
    typeof version !== "number" ||
    !Number.isSafeInteger(version) ||
    typeof createdAt !== "string" ||
    !Number.isFinite(Date.parse(createdAt)) ||
    typeof updatedAt !== "string" ||
    !Number.isFinite(Date.parse(updatedAt))
  )
    throw new Error("Invalid note response");
  return { id, offerId, body, version, createdAt, updatedAt };
}
export function notesRepository(client: SupabaseClient) {
  async function mutate(name: string, args: Record<string, unknown>) {
    const result = await client.rpc(name, args);
    if (result.error)
      throw new NoteFailure(
        result.error.code === "40001",
        result.error.code === "40001"
          ? "This note changed on another device or was deleted. Your draft is kept. Review the latest notes before retrying."
          : "Note was not saved. Check your connection and try again.",
      );
    return result.data;
  }
  return {
    async list(offerId: string): Promise<OfferNote[]> {
      const result = await client
        .from("offer_notes")
        .select("*")
        .eq("offer_id", offerId)
        .order("created_at")
        .order("id");
      if (result.error || !Array.isArray(result.data))
        throw new Error(
          "Unable to load notes. Check your connection and try again.",
        );
      return result.data.map(decode);
    },
    async create(offerId: string, body: string): Promise<OfferNote> {
      return decode(
        await mutate("create_offer_note", {
          p_offer_id: offerId,
          p_body: body,
        }),
      );
    },
    async edit(note: OfferNote, body: string): Promise<OfferNote> {
      return decode(
        await mutate("edit_offer_note", {
          p_id: note.id,
          p_body: body,
          p_expected_version: note.version,
        }),
      );
    },
    async remove(note: OfferNote): Promise<void> {
      await mutate("delete_offer_note", {
        p_id: note.id,
        p_expected_version: note.version,
      });
    },
  };
}
export type NotesRepository = ReturnType<typeof notesRepository>;
