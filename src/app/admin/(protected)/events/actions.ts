"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  addEventImage,
  deleteEventImage,
  type EventInput,
} from "@/lib/supabase/admin/events";
import { uploadEventImage } from "@/lib/supabase/admin/storage";

export type FormState = { error: string | null };

async function readEventInput(formData: FormData): Promise<{ input: EventInput | null; error: string | null }> {
  const optional = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw.length > 0 ? raw : null;
  };

  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  if (!slug || !title) {
    return { input: null, error: "Slug and title are both required." };
  }

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

  return {
    input: {
      slug,
      title,
      description: optional("description"),
      cover_image_url,
      published: formData.get("published") === "on",
      event_date: optional("event_date"),
      page_number: pageNumberRaw ? Number(pageNumberRaw) : null,
    },
    error: null,
  };
}

export async function createEventAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = await readEventInput(formData);
  if (!input) return { error: validationError };

  const { id, error } = await createEvent(input);
  if (error) return { error };

  // Handle gallery images
  if (id) {
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
          await addEventImage(id, url, null, order);
          order++;
        }
      }
    }
  }

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
  redirect("/admin/events");
}

export async function updateEventAction(
  eventId: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = await readEventInput(formData);
  if (!input) return { error: validationError };

  const { error } = await updateEvent(eventId, input);
  if (error) return { error };

  // Handle gallery image removals
  const removeIds = String(formData.get("remove_image_ids") ?? "")
    .split(",")
    .filter(Boolean);
  for (const imgId of removeIds) {
    await deleteEventImage(imgId);
  }

  // Handle new gallery image uploads
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

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath(`/events/${input.slug}`);
  revalidatePath("/");
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
