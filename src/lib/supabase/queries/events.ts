import type { UntypedSupabaseClient } from "@/lib/supabase/client";
import type { EventRow, EventImageRow } from "@/lib/supabase/types";
import type { Event, EventGalleryImage } from "@/lib/types";

export async function getEvents(
  supabase: UntypedSupabaseClient
): Promise<Event[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("published", true)
    .order("event_date", { ascending: false, nullsFirst: false });

  if (error || !data) return [];
  return (data as EventRow[]).map((row): Event => ({
    slug: row.slug,
    title: row.title,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    eventDate: row.event_date,
    pageNumber: row.page_number,
  }));
}

export async function getEventBySlug(
  supabase: UntypedSupabaseClient,
  slug: string
): Promise<Event | null> {
  const { data: eventData, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (eventError || !eventData) return null;
  const eventRow = eventData as EventRow;

  const { data: imagesData } = await supabase
    .from("event_images")
    .select("*")
    .eq("event_id", eventRow.id)
    .order("display_order", { ascending: true });

  const images = ((imagesData ?? []) as EventImageRow[]).map(
    (img): EventGalleryImage => ({
      id: img.id,
      imageUrl: img.image_url,
      caption: img.caption,
      displayOrder: img.display_order,
    })
  );

  return {
    slug: eventRow.slug,
    title: eventRow.title,
    description: eventRow.description,
    coverImageUrl: eventRow.cover_image_url,
    eventDate: eventRow.event_date,
    pageNumber: eventRow.page_number,
    galleryImages: images,
  };
}
