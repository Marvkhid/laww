"use client";

import { useActionState, useState, useCallback, useRef } from "react";
import type { EventRow, EventImageRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/events/actions";
import {
  autosaveEventAction,
  removePendingGalleryImageAction,
  uploadEventImageAction,
} from "@/app/admin/(protected)/events/actions";
import { slugify } from "@/lib/slugify";
import {
  TextField,
  TextAreaField,
  FormSection,
} from "@/components/forms/kit/field";
import { ImageUploadZone, RemoveThumbButton } from "@/components/forms/kit/image-upload";
import { PageVisibilityField } from "@/components/forms/kit/page-visibility";
import { PageTargetingNotice } from "@/app/admin/(protected)/page-targeting-notice";
import { EVENT_PAGE_OPTIONS, pagesForRow } from "@/lib/page-visibility";
import { motion, useReducedMotion } from "motion/react";
import { useAutosave } from "@/components/forms/kit/use-autosave";
import {
  AutosaveRecoveryBanner,
  AutosaveStatus,
  SaveButtons,
} from "@/components/forms/kit/autosave-status";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

export function EventForm({
  action,
  initial,
  initialImages,
  entityId,
  submitLabel,
  pageTargeting = false,
}: {
  action: ActionFn;
  initial?: Pick<
    EventRow,
    | "slug"
    | "title"
    | "description"
    | "cover_image_url"
    | "published"
    | "event_date"
    | "page_number"
    | "show_on_pages"
  >;
  initialImages?: EventImageRow[];
  entityId?: string;
  submitLabel: string;
  pageTargeting?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const formRef = useRef<HTMLFormElement>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(initial?.cover_image_url ?? null);
  const [removeImageIds, setRemoveImageIds] = useState<string[]>([]);
  const [pendingGalleryUrls, setPendingGalleryUrls] = useState<string[]>([]);
  const [slugManualOverride, setSlugManualOverride] = useState(false);
  const reduce = useReducedMotion();

  const autosave = useAutosave({
    formRef,
    save: (id, data) => autosaveEventAction(id, data),
    initialId: entityId ?? null,
    skip: (data) => !(data.title?.[0] ?? "").trim(),
    autoRecover: !initial,
    onSlugResolved: (slug) => {
      if (initial?.slug || slugManualOverride) return;
      const slugInput = document.getElementById("slug") as HTMLInputElement | null;
      if (slugInput && !slugInput.readOnly) slugInput.value = slug;
    },
  });

  const onTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!slugManualOverride && !initial?.slug) {
        const slugInput = document.getElementById("slug") as HTMLInputElement | null;
        if (slugInput) slugInput.value = slugify(e.target.value);
      }
    },
    [slugManualOverride, initial?.slug],
  );

  const existingImages = (initialImages ?? []).filter(
    (img) => !removeImageIds.includes(img.id)
  );

  // Where this event is allowed to show. Defaults to homepage + Events so a
  // published event is never hidden from the homepage by accident.
  const selectedPages =
    pagesForRow(initial?.show_on_pages, EVENT_PAGE_OPTIONS) ??
    EVENT_PAGE_OPTIONS.map((option) => option.key);

  return (
    <form ref={formRef} action={formAction} className="flex max-w-2xl flex-col gap-5">
      <input type="hidden" name="autosave_id" value={autosave.draftId ?? ""} />
      <input
        type="hidden"
        name="pending_gallery_urls"
        value={JSON.stringify(pendingGalleryUrls)}
      />
      {autosave.recovery ? (
        <AutosaveRecoveryBanner
          recovery={autosave.recovery}
          onRecover={autosave.recover}
          onDismiss={autosave.dismissRecovery}
        />
      ) : null}
      <FormSection title="Event Details" subtitle="Title, date, and description." accent="top">
        <TextField
          label="Event title"
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initial?.title}
          onChange={onTitleChange}
          placeholder="e.g. Annual Law Conference 2026"
          helper={initial?.slug ? undefined : "The URL slug is generated automatically as you type."}
          index={0}
        />

        <div className="flex flex-col">
          <label htmlFor="slug" className="font-admin text-[11px] font-semibold uppercase tracking-[0.12em] text-stone">
            Slug
          </label>
          {initial?.slug ? (
            <>
              <input
                id="slug"
                name="slug"
                type="text"
                readOnly
                defaultValue={initial.slug}
                className="mt-1.5 w-full cursor-not-allowed border border-hairline bg-hairline/20 px-4 py-3 font-admin text-sm text-stone"
                style={{ borderRadius: 2 }}
              />
              <input type="hidden" name="slug" value={initial.slug} />
            </>
          ) : (
            <input
              id="slug"
              name="slug"
              type="text"
              required
              placeholder="auto-generated-from-title"
              onChange={() => setSlugManualOverride(true)}
              className="mt-1.5 w-full border border-hairline bg-white px-4 py-3 font-admin text-sm text-ink"
              style={{ borderRadius: 2 }}
            />
          )}
        </div>

        <TextAreaField
          label="Description"
          optional
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          placeholder="What happens at this event?"
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Event date"
            optional
            id="event_date"
            name="event_date"
            type="date"
            defaultValue={initial?.event_date ?? ""}
            index={1}
          />
          <TextField
            label="Page number"
            optional
            id="event_page_number"
            name="page_number"
            type="number"
            min={1}
            step={1}
            defaultValue={initial?.page_number ?? ""}
            placeholder="e.g. 30"
            index={2}
          />
          <div className="flex items-end pb-2">
            <p className="font-admin text-xs text-stone">
              Status:{" "}
              <strong className="font-semibold text-ink">
                {initial?.published ? "Published" : "Draft"}
              </strong>
              {" "}— use Publish to publish; Save keeps this state.
            </p>
          </div>
        </div>
      </FormSection>

      {pageTargeting ? (
        <FormSection
          title="Display On"
          subtitle="Where this event is listed. Keep Homepage ticked to feature it on the front page."
          accent="left"
        >
          <PageVisibilityField
            options={EVENT_PAGE_OPTIONS}
            selected={selectedPages}
          />
        </FormSection>
      ) : (
        <PageTargetingNotice />
      )}

      <FormSection title="Cover Image" subtitle="The hero image for this event." accent="left">
        <ImageUploadZone
          name="cover_image_file"
          label={coverPreview ? "Replace cover image" : "Upload cover image"}
          existingHiddenName="existing_cover_image_url"
          existingValue={initial?.cover_image_url ?? ""}
          initialPreview={coverPreview}
          previewAspect="aspect-[16/10]"
          onFilesSelected={(files) => setCoverPreview(URL.createObjectURL(files[0]))}
          upload={uploadEventImageAction}
        />
      </FormSection>

      <FormSection title="Gallery Images" subtitle="Select multiple images at once. JPEG, PNG, WEBP, or GIF, up to 5MB each." accent="left">
        {existingImages.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {existingImages.map((img, i) => (
              <motion.div
                key={img.id}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? undefined : { opacity: 0, scale: 0.9 }}
                transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 26, delay: i * 0.03 }}
                className="relative aspect-square overflow-hidden border border-hairline bg-white"
                style={{ borderRadius: 2 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.image_url} alt={img.caption ?? "Gallery"} className="h-full w-full object-cover" />
                <RemoveThumbButton
                  label={`Remove gallery image ${i + 1}`}
                  onRemove={() => setRemoveImageIds((prev) => [...prev, img.id])}
                />
                {img.caption ? (
                  <span className="absolute bottom-0 left-0 right-0 bg-ink/60 px-1 py-0.5 font-admin text-[8px] text-paper">
                    {img.caption}
                  </span>
                ) : null}
              </motion.div>
            ))}
          </div>
        ) : null}
        {pendingGalleryUrls.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {pendingGalleryUrls.map((url, i) => (
              <div
                key={url}
                className="relative aspect-square overflow-hidden border border-hairline bg-white"
                style={{ borderRadius: 2 }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="New gallery upload" className="h-full w-full object-cover" />
                <RemoveThumbButton
                  label={`Remove uploaded gallery image ${i + 1}`}
                  onRemove={() => {
                    setPendingGalleryUrls((prev) => prev.filter((value) => value !== url));
                    void removePendingGalleryImageAction(autosave.draftId ?? null, url);
                  }}
                />
              </div>
            ))}
          </div>
        ) : null}
        <ImageUploadZone
          name="gallery_files"
          label="Add gallery images"
          multiple
          compact
          previewAspect="aspect-square"
          upload={uploadEventImageAction}
          onUploaded={(urls) => setPendingGalleryUrls((prev) => [...prev, ...urls])}
        />
        <input type="hidden" name="remove_image_ids" value={removeImageIds.join(",")} />
      </FormSection>

      {state.error ? (
        <p role="alert" className="font-admin text-sm font-medium text-digest-red">
          {state.error}
        </p>
      ) : null}

      <SaveButtons
        formRef={formRef}
        flush={autosave.flush}
        isPending={isPending}
        saveLabel={submitLabel}
        publishLabel="Publish"
        showPublish
        showUnpublish={Boolean(initial?.published)}
        statusSlot={
          <AutosaveStatus
            status={autosave.status}
            lastSavedAt={autosave.lastSavedAt}
            errorMessage={autosave.errorMessage}
            onRetry={autosave.retry}
          />
        }
      />
    </form>
  );
}
