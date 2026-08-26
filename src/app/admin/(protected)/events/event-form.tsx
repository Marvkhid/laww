"use client";

import { useActionState, useState } from "react";
import type { EventRow, EventImageRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/events/actions";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

export function EventForm({
  action,
  initial,
  initialImages,
  entityId,
  submitLabel,
}: {
  action: ActionFn;
  initial?: Pick<EventRow, "slug" | "title" | "description" | "cover_image_url" | "published" | "event_date" | "page_number">;
  initialImages?: EventImageRow[];
  entityId?: string;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const [coverPreview, setCoverPreview] = useState<string | null>(initial?.cover_image_url ?? null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [removeImageIds, setRemoveImageIds] = useState<string[]>([]);

  const existingImages = (initialImages ?? []).filter(
    (img) => !removeImageIds.includes(img.id)
  );

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div>
        <label htmlFor="title" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Event Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initial?.title}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div>
        <label htmlFor="slug" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          required
          defaultValue={initial?.slug}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div>
        <label htmlFor="description" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Description <span className="normal-case text-[#333]">(optional)</span>
        </label>
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label htmlFor="event_date" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
            Event Date <span className="normal-case text-[#333]">(optional)</span>
          </label>
          <input
            id="event_date"
            name="event_date"
            type="date"
            defaultValue={initial?.event_date ?? ""}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          />
        </div>
        <div>
          <label htmlFor="event_page_number" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
            Page Number <span className="normal-case text-[#333]">(optional)</span>
          </label>
          <input
            id="event_page_number"
            name="page_number"
            type="number"
            min={1}
            step={1}
            defaultValue={initial?.page_number ?? ""}
            placeholder="e.g. 30"
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          />
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 font-admin text-sm text-ink">
            <input
              type="checkbox"
              name="published"
              defaultChecked={initial?.published ?? true}
            />
            Published
          </label>
        </div>
      </div>

      {/* Cover Image */}
      <fieldset className="border border-hairline p-4">
        <legend className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Cover Image <span className="normal-case text-[#333]">(optional)</span>
        </legend>
        {coverPreview ? (
          <div className="mt-2 aspect-[16/10] w-full max-w-xs overflow-hidden border border-hairline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
          </div>
        ) : null}
        <input
          id="cover_image_file"
          name="cover_image_file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) setCoverPreview(URL.createObjectURL(file));
          }}
          className="mt-2 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
        <input type="hidden" name="existing_cover_image_url" value={initial?.cover_image_url ?? ""} />
      </fieldset>

      {/* Gallery Images */}
      <fieldset className="border border-hairline p-4">
        <legend className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Gallery Images <span className="normal-case text-[#333]">(optional)</span>
        </legend>
        {existingImages.length > 0 ? (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {existingImages.map((img) => (
              <div key={img.id} className="relative aspect-square overflow-hidden border border-hairline">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.image_url} alt={img.caption ?? "Gallery"} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setRemoveImageIds((prev) => [...prev, img.id])}
                  className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center bg-digest-red text-xs text-paper"
                >
                  ×
                </button>
                {img.caption ? (
                  <span className="absolute bottom-0 left-0 right-0 bg-ink/60 px-1 py-0.5 font-admin text-[8px] text-paper">
                    {img.caption}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {galleryPreviews.length > 0 ? (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {galleryPreviews.map((src, i) => (
              <div key={i} className="aspect-square overflow-hidden border border-hairline">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`New gallery ${i + 1}`} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : null}
        <input
          id="gallery_files"
          name="gallery_files"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            setGalleryFiles(files);
            setGalleryPreviews(files.map((f) => URL.createObjectURL(f)));
          }}
          className="mt-2 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
        <input type="hidden" name="remove_image_ids" value={removeImageIds.join(",")} />
        <p className="mt-1 font-admin text-xs text-[#333]">
          Select multiple images at once. JPEG, PNG, WEBP, or GIF, up to 5MB each.
        </p>
      </fieldset>

      {entityId ? <input type="hidden" name="entity_id" value={entityId} /> : null}
      {state.error ? <p className="font-admin text-sm text-digest-red">{state.error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="w-fit bg-digest-red px-6 py-3 font-admin text-sm uppercase tracking-wide text-paper disabled:opacity-60"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
