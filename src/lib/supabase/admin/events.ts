import { requireAdmin } from "@/lib/supabase/admin/require-admin";
import type { EventRow, EventImageRow } from "@/lib/supabase/types";

export type EventInput = {
  slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  published: boolean;
  event_date: string | null;
  page_number: number | null;
};

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
  const { data, error } = await supabase
    .from("events")
    .insert(input)
    .select("id")
    .single();

  if (error) {
    console.error("createEvent error:", error);
    if (error.code === "23505") {
      return { id: null, error: "That slug is already in use by another event." };
    }
    if (error.code === "42703" || error.code === "PGRST204") {
      const { page_number: _, ...rest } = input;
      const { data: retryData, error: retryError } = await supabase
        .from("events")
        .insert(rest)
        .select("id")
        .single();
      if (retryError) {
        console.error("createEvent retry error:", retryError);
        return { id: null, error: "Could not create the event. Please try again." };
      }
      return { id: (retryData as { id: string }).id, error: null };
    }
    return { id: null, error: "Could not create the event. Please try again." };
  }
  return { id: (data as { id: string }).id, error: null };
}

export async function updateEvent(id: string, input: EventInput): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  const { error } = await supabase.from("events").update(input).eq("id", id);

  if (error) {
    console.error("updateEvent error:", error);
    if (error.code === "23505") {
      return { error: "That slug is already in use by another event." };
    }
    // If the column doesn't exist yet (migration not applied), retry without it
    if (error.code === "42703" || error.code === "PGRST204") {
      const { page_number: _, ...rest } = input;
      const { error: retryError } = await supabase.from("events").update(rest).eq("id", id);
      if (retryError) {
        console.error("updateEvent retry error:", retryError);
        return { error: "Could not update the event. Please try again." };
      }
      return { error: null };
    }
    return { error: "Could not update the event. Please try again." };
  }
  return { error: null };
}

export async function deleteEvent(id: string): Promise<{ error: string | null }> {
  const supabase = await requireAdmin();
  // event_images cascades on delete
  const { error } = await supabase.from("events").delete().eq("id", id);

  if (error) return { error: "Could not delete the event. Please try again." };
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
