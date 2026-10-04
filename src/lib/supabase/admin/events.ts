import { requireAdmin } from "@/lib/supabase/admin/require-admin";
import type { EventRow, EventImageRow } from "@/lib/supabase/types";

export type EventInput = {
  slug: string;
  title: string;
  /** `undefined` = field absent from the payload → column omitted on UPDATE. */
  description: string | null | undefined;
  cover_image_url: string | null;
  published: boolean;
  event_date: string | null;
  page_number: number | null;
  /** Page keys from the admin's "Display On" group; omitted when unavailable. */
  show_on_pages?: string[];
};

// show_on_pages lives in its own statement so a missing column (migration
// 0025 not applied yet) can never roll back the event itself; the admin form
// withholds the "Display On" group in that state, so nothing is lost.
async function applyPageVisibility(
  supabase: Awaited<ReturnType<typeof requireAdmin>>,
  eventId: string,
  pages: string[] | undefined
): Promise<void> {
  if (!pages) return;
  const { error } = await supabase
    .from("events")
    .update({ show_on_pages: pages })
    .eq("id", eventId);
  if (error) {
    if (error.code === "42703" || error.code === "PGRST204") {
      console.warn("show_on_pages column not found — run migration 0025_page_visibility");
    } else {
      console.error("applyPageVisibility error:", error);
    }
  }
}

export async function listEventsForAdmin(): Promise<EventRow[]> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as EventRow[];
}

export async function getEventByIdForAdmin(id: string): Promise<EventRow | null> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as EventRow;
}

export async function getEventImagesForAdmin(eventId: string): Promise<EventImageRow[]> {
  const supabase = await requireAdmin();
  const { data, error } = await supabase
    .from("event_images")
    .select("*")
    .eq("event_id", eventId)
    .order("display_order", { ascending: true });

  if (error || !data) return [];
  return data as EventImageRow[];
}

export async function createEvent(input: EventInput): Promise<{ id: string | null; error: string | null }> {
  const supabase = await requireAdmin();
  const { show_on_pages, ...row } = input;
  const { data, error } = await supabase
    .from("events")
    .insert(row)
    .select("id")
    .single();

  if (error) {
    console.error("createEvent error:", error);
    if (error.code === "23505") {
      return { id: null, error: "That slug is already in use by another event." };
    }
    if (error.code === "42703" || error.code === "PGRST204") {
      const { page_number: _, ...rest } = row;
      const { data: retryData, error: retryError } = await supabase
        .from("events")
        .insert(rest)
        .select("id")
        .single();
      if (retryError) {
        console.error("createEvent retry error:", retryError);
        return { id: null, error: "Could not create the event. Please try again." };
      }
      const retryId = (retryData as { id: string }).id;
      await applyPageVisibility(supabase, retryId, show_on_pages);
      return { id: retryId, error: null };
    }
    return { id: null, error: "Could not create the event. Please try again." };
  }

  const createdId = (data as { id: string }).id;
  await applyPageVisibility(supabase, createdId, show_on_pages);
  return { id: createdId, error: null };
}

export async function updateEvent(id: string, input: EventInput): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { show_on_pages, ...row } = input;
  const { error } = await supabase.from("events").update(row).eq("id", id);

  if (error) {
    console.error("updateEvent error:", error);
    if (error.code === "23505") {
      return { error: "That slug is already in use by another event." };
    }
    // If the column doesn't exist yet (migration not applied), retry without it
    if (error.code === "42703" || error.code === "PGRST204") {
      const { page_number: _, ...rest } = row;
      const { error: retryError } = await supabase.from("events").update(rest).eq("id", id);
      if (retryError) {
        console.error("updateEvent retry error:", retryError);
        return { error: "Could not update the event. Please try again." };
      }
      await applyPageVisibility(supabase, id, show_on_pages);
      return { error: null };
    }
    return { error: "Could not update the event. Please try again." };
  }
  await applyPageVisibility(supabase, id, show_on_pages);
  return { error: null };
}

export async function deleteEvent(id: string): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  // event_images cascades on delete
  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) return { error: "Could not delete the event. Please try again." };
  return { error: null };
}

/**
 * Attach gallery images that were uploaded ahead of time (upload-on-select)
 * or carried in a pending list. Idempotent: a URL already attached to this
 * event is skipped, so autosave can re-send the pending list every cycle
 * without ever producing duplicate gallery rows.
 */
export async function attachEventImages(
  eventId: string,
  imageUrls: string[]
): Promise<{ error: string | null }> {
  if (imageUrls.length === 0) return { error: null };
  const supabase = await requireAdmin();

  const { data: existing, error: readError } = await supabase
    .from("event_images")
    .select("image_url")
    .eq("event_id", eventId);
  if (readError) return { error: "Could not attach gallery images. Please try again." };

  const present = new Set((existing ?? []).map((row) => row.image_url));
  let nextOrder = (existing ?? []).length;

  for (const url of imageUrls) {
    if (!url || present.has(url)) continue;
    const { error } = await supabase.from("event_images").insert({
      event_id: eventId,
      image_url: url,
      caption: null,
      display_order: nextOrder,
    });
    if (error) {
      console.error("attachEventImages error:", error);
      return { error: "Could not attach gallery images. Please try again." };
    }
    present.add(url);
    nextOrder += 1;
  }
  return { error: null };
}

/** Detach a pending gallery URL (by value) — used when the admin cancels an upload. */
export async function deleteEventImageByUrl(
  eventId: string,
  imageUrl: string
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase
    .from("event_images")
    .delete()
    .eq("event_id", eventId)
    .eq("image_url", imageUrl);
  if (error) return { error: "Could not remove the image. Please try again." };
  return { error: null };
}

export async function addEventImage(
  eventId: string,
  imageUrl: string,
  caption: string | null,
  displayOrder: number
): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("event_images").insert({
    event_id: eventId,
    image_url: imageUrl,
    caption,
    display_order: displayOrder,
  });

  if (error) return { error: "Could not add the image. Please try again." };
  return { error: null };
}

export async function deleteEventImage(id: string): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("event_images").delete().eq("id", id);

  if (error) return { error: "Could not delete the image. Please try again." };
  return { error: null };
}
