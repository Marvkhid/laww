import type { UntypedSupabaseClient } from "@/lib/supabase/client";
import type { EventRow, EventImageRow } from "@/lib/supabase/types";
import type { Event, EventGalleryImage } from "@/lib/types";
import { EVENT_PAGE_OPTIONS, isVisibleOn, pagesForRow, type PageKey } from "@/lib/page-visibility";

function eventVisibleOn(row: EventRow, page: PageKey): boolean {
  return isVisibleOn(pagesForRow(row.show_on_pages, EVENT_PAGE_OPTIONS), page);
}

async function getEventsForPage(
  supabase: UntypedSupabaseClient,
  page: PageKey,
  limit?: number
): Promise<Event[]> {
  let query = supabase
    .from("events")
    .select("*")
    .eq("published", true)
    .order("event_date", { ascending: false, nullsFirst: false });
  if (limit) query = query.limit(limit);

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as EventRow[])
    // Rows saved before migration 0025 carry no show_on_pages value and
    // stay visible everywhere (today's behaviour).
    .filter((row) => eventVisibleOn(row, page))
    .map((row): Event => ({
      slug: row.slug,
      title: row.title,
      description: row.description,
      coverImageUrl: row.cover_image_url,
      eventDate: row.event_date,
      pageNumber: row.page_number,
    }));
}

export async function getEvents(
  supabase: UntypedSupabaseClient
): Promise<Event[]> {
  return getEventsForPage(supabase, "events");
}

/**
 * Events the admin allowed on the homepage — the homepage reads the same
 * show_on_pages column the admin form writes, so "Show on Homepage" is
 * honoured end to end instead of living in a separate hard-coded list.
 */
export async function getHomepageEvents(
  supabase: UntypedSupabaseClient,
  limit = 4
): Promise<Event[]> {
  return getEventsForPage(supabase, "homepage", limit);
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
