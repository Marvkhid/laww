"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  addEventImage,
  deleteEventImage,
  attachEventImages,
  deleteEventImageByUrl,
  getEventByIdForAdmin,
  type EventInput,
} from "@/lib/supabase/admin/events";
import { uploadEventImage } from "@/lib/supabase/admin/storage";
import { slugify } from "@/lib/slugify";
import {
  EVENT_PAGE_OPTIONS,
  pagesFromFormData,
} from "@/lib/page-visibility";
import { dataToFormData, type AutosaveResult } from "@/lib/autosave";

export type FormState = { error: string | null };

/** Gallery URLs uploaded ahead of time (upload-on-select), carried as JSON. */
function readPendingGallery(formData: FormData): string[] {
  const raw = String(formData.get("pending_gallery_urls") ?? "").trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((value): value is string => typeof value === "string" && value.length > 0)
      : [];
  } catch {
    return [];
  }
}

/** Save vs Publish — autosave and Enter-key submits always stay draft-safe. */
function readSaveMode(formData: FormData): "save" | "publish" | "unpublish" {
  const mode = String(formData.get("save_mode") ?? "save");
  return mode === "publish" || mode === "unpublish" ? mode : "save";
}

async function readEventInput(formData: FormData): Promise<{ input: EventInput | null; error: string | null }> {
  const optional = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw.length > 0 ? raw : null;
  };

  const slugRaw = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  if (!title) {
    return { input: null, error: "Title is required." };
  }
  const slug = slugRaw.length > 0 ? slugRaw : slugify(title);

  // Cover image upload
  let cover_image_url: string | null = optional("existing_cover_image_url");
  const coverFile = formData.get("cover_image_file");
  if (coverFile instanceof File && coverFile.size > 0) {
    const { url, error } = await uploadEventImage(coverFile);
    if (error) return { input: null, error };
    cover_image_url = url;
  }

  const pageNumberRaw = String(formData.get("page_number") ?? "").trim();
  if (pageNumberRaw && !Number.isInteger(Number(pageNumberRaw))) {
    return { input: null, error: "Page number must be a whole number." };
  }

  // "Display On" — null when the group was not rendered (migration 0025
  // pending), so the column keeps its current value.
  const show_on_pages = pagesFromFormData(formData, EVENT_PAGE_OPTIONS);
  if (show_on_pages && show_on_pages.length === 0) {
    return { input: null, error: "Select at least one page under Display On." };
  }

  return {
    input: {
      slug,
      title,
      description: optional("description"),
      cover_image_url,
      published: formData.get("published") === "on",
      event_date: optional("event_date"),
      page_number: pageNumberRaw ? Number(pageNumberRaw) : null,
      ...(show_on_pages ? { show_on_pages } : {}),
    },
    error: null,
  };
}

/**
 * Gallery changes shared by Save, Publish and autosave: removals, legacy
 * file uploads and the idempotent attach of upload-on-select URLs.
 */
async function applyGalleryChanges(eventId: string, formData: FormData): Promise<void> {
  const removeIds = String(formData.get("remove_image_ids") ?? "")
    .split(",")
    .filter(Boolean);
  for (const imgId of removeIds) {
    await deleteEventImage(imgId);
  }

  const files = formData.getAll("gallery_files");
  let order = 0;
  for (const file of files) {
    if (file instanceof File && file.size > 0) {
      const { url, error: uploadError } = await uploadEventImage(file);
      if (!uploadError && url) {
        await addEventImage(eventId, url, null, order);
        order++;
      }
    }
  }

  const pending = readPendingGallery(formData);
  if (pending.length > 0) {
    await attachEventImages(eventId, pending);
  }
}

function revalidateEventPaths(slug?: string) {
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
  if (slug) revalidatePath(`/events/${slug}`);
}

/** Upload-on-select for event covers and gallery images. */
export async function uploadEventImageAction(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  return uploadEventImage(file);
}

/** Cancel a pending gallery upload (detaches it if autosave already attached it). */
export async function removePendingGalleryImageAction(
  eventId: string | null,
  url: string
): Promise<{ error: string | null }> {
  if (!eventId) return { error: null }; // not created yet — nothing attached
  return deleteEventImageByUrl(eventId, url);
}

/**
 * Autosave — never publishes (new rows are forced draft; existing rows keep
 * their `published` flag), never redirects, never revalidates.
 */
export async function autosaveEventAction(
  id: string | null,
  rawData: Record<string, string[]>
): Promise<AutosaveResult> {
  const formData = dataToFormData(rawData);
  const { input, error: validationError } = await readEventInput(formData);
  if (!input) return { id, error: validationError ?? "Invalid event." };

  if (!id) {
    input.published = false;
    const created = await createEvent(input);
    if (created.error && created.error.includes("slug")) {
      const fallbackSlug = `${input.slug}-${Date.now().toString(36)}`;
      const retry = await createEvent({ ...input, slug: fallbackSlug });
      if (retry.id) {
        await attachEventImages(retry.id, readPendingGallery(formData));
        return { id: retry.id, error: null };
      }
    }
    if (created.id) await attachEventImages(created.id, readPendingGallery(formData));
    return { id: created.id, error: created.error };
  }

  const current = await getEventByIdForAdmin(id);
  if (!current) {
    return { id, error: "This draft no longer exists. Reload the editor." };
  }
  input.published = current.published;
  const { error } = await updateEvent(id, input);
  if (error) return { id, error };
  await attachEventImages(id, readPendingGallery(formData));
  return { id, error: null };
}

export async function createEventAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = await readEventInput(formData);
  if (!input) return { error: validationError };

  const mode = readSaveMode(formData);
  const autosaveId = String(formData.get("autosave_id") ?? "").trim();

  // Autosave already created the draft row — continue in it.
  if (autosaveId) {
    const current = await getEventByIdForAdmin(autosaveId);
    if (current) {
      input.published =
        mode === "publish" ? true : mode === "unpublish" ? false : current.published;
      const { error } = await updateEvent(autosaveId, input);
      if (error) return { error };
      await applyGalleryChanges(autosaveId, formData);
      revalidateEventPaths(input.slug);
      redirect("/admin/events");
    }
  }

  // Save never publishes a brand-new event; only Publish does.
  input.published = mode === "publish";

  const { id, error } = await createEvent(input);
  if (error) return { error };

  if (id) {
    await applyGalleryChanges(id, formData);
  }

  revalidateEventPaths(input.slug);
  redirect("/admin/events");
}

export async function updateEventAction(
  eventId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = await readEventInput(formData);
  if (!input) return { error: validationError };

  const mode = readSaveMode(formData);
  const current = await getEventByIdForAdmin(eventId);
  if (!current) return { error: "This event no longer exists." };
  input.published =
    mode === "publish" ? true : mode === "unpublish" ? false : current.published;

  const { error } = await updateEvent(eventId, input);
  if (error) return { error };

  await applyGalleryChanges(eventId, formData);

  revalidateEventPaths(input.slug);
  redirect("/admin/events");
}

export async function deleteEventAction(id: string) {
  const { error } = await deleteEvent(id);
  if (error) return { error };

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
  return { error: null };
}
