"use client";

import { useActionState, useRef, useState, useCallback } from "react";
import type { PracticeAreaRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/practice-areas/actions";
import {
  autosavePracticeAreaAction,
  uploadPracticeAreaImageAction,
} from "@/app/admin/(protected)/practice-areas/actions";
import { slugify } from "@/lib/slugify";
import {
  TextField,
  TextAreaField,
  FormSection,
} from "@/components/forms/kit/field";
import { SubmitButton } from "@/components/forms/kit/submit-button";
import { ImageUploadZone } from "@/components/forms/kit/image-upload";
import { useAutosave } from "@/components/forms/kit/use-autosave";
import {
  AutosaveRecoveryBanner,
  AutosaveStatus,
} from "@/components/forms/kit/autosave-status";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

export function PracticeAreaForm({
  action,
  initial,
  submitLabel,
}: {
  action: ActionFn;
  initial?: Pick<
    PracticeAreaRow,
    "id" | "slug" | "name" | "description" | "image_url" | "image_alt" | "display_order"
  >;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const formRef = useRef<HTMLFormElement>(null);
  const [hasNewFile, setHasNewFile] = useState(false);
  // Bumped when the editor removes the current image — remounts the upload
  // zone so its preview and the existing_image_url hidden input reset.
  const [imageVersion, setImageVersion] = useState(0);
  const [imageRemoved, setImageRemoved] = useState(false);
  // React state, not an uncontrolled hidden input: React rewrites an
  // uncontrolled hidden input's live `.value` from `defaultValue` on every
  // commit, so an unrelated re-render (image upload, autosave status) used to
  // wipe the live-tracked slug back to "" and the save then regenerated it —
  // losing the conflict-free slug the autosave had already resolved.
  const [slugValue, setSlugValue] = useState(initial?.slug ?? "");

  const onNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // New records: slug live-tracks the name. Existing records keep their
      // saved slug untouched so the public URL never breaks.
      if (!initial?.slug) {
        const generated = slugify(e.target.value);
        const slugInput = document.getElementById("slug") as HTMLInputElement | null;
        if (slugInput) slugInput.value = generated;
        setSlugValue(generated);
      }
    },
    [initial?.slug],
  );

  const removeImage = () => {
    setImageVersion((v) => v + 1);
    setImageRemoved(true);
    setHasNewFile(false);
  };

  const onFilesSelected = () => {
    setHasNewFile(true);
    setImageRemoved(false);
  };

  const currentImageUrl = imageVersion === 0 ? (initial?.image_url ?? "") : "";
  const currentPreview = imageVersion === 0 ? (initial?.image_url ?? null) : null;

  const autosave = useAutosave({
    formRef,
    save: (id, data) => autosavePracticeAreaAction(id, data),
    initialId: initial?.id ?? null,
    skip: (data) => !(data.name?.[0] ?? "").trim(),
    autoRecover: !initial,
    onSlugResolved: (slug) => {
      if (initial?.slug) return;
      setSlugValue(slug);
    },
  });

  return (
    <form ref={formRef} action={formAction} className="flex max-w-xl flex-col gap-5">
      <input type="hidden" name="autosave_id" value={autosave.draftId ?? ""} />
      {autosave.recovery ? (
        <AutosaveRecoveryBanner
          recovery={autosave.recovery}
          onRecover={autosave.recover}
          onDismiss={autosave.dismissRecovery}
        />
      ) : null}
      <FormSection title="Practice Area" subtitle="Identity for this coverage area." accent="top">
        <TextField
          label="Name"
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initial?.name}
          placeholder="e.g. Corporate & Commercial"
          index={0}
          onChange={onNameChange}
        />
        <input type="hidden" id="slug_hidden" name="slug" value={slugValue} readOnly />
        <p className="font-admin text-xs text-stone">
          Slug: <span id="slug_display" className="font-medium text-ink">
            {slugValue || "auto-generated from name"}
          </span>
          {initial?.slug
            ? " — preserved to keep the public URL stable."
            : " (auto-generated on save)"}
        </p>
      </FormSection>

      <FormSection title="Description" subtitle="Shown with this practice area on the homepage and its detail page." accent="left">
        <TextAreaField
          label="Description"
          optional
          id="description"
          name="description"
          rows={4}
          defaultValue={initial?.description ?? ""}
          placeholder="Give readers a concise overview of this coverage area…"
        />
      </FormSection>

      <FormSection title="Image" subtitle="Displayed with this practice area on the homepage." accent="left">
        <ImageUploadZone
          key={imageVersion}
          name="image_file"
          label={hasNewFile ? "Replace image" : "Upload image"}
          existingHiddenName="existing_image_url"
          existingValue={currentImageUrl}
          initialPreview={currentPreview}
          previewAspect="aspect-[16/9]"
          onFilesSelected={onFilesSelected}
          upload={uploadPracticeAreaImageAction}
        />
        {/* Server action reads this flag to drop a previously saved image. */}
        <input type="hidden" name="remove_image" value={imageRemoved ? "1" : ""} />
        <TextField
          label="Image alt text"
          optional
          id="image_alt"
          name="image_alt"
          type="text"
          defaultValue={initial?.image_alt ?? ""}
          placeholder={`Describe the image, e.g. "${initial?.name ?? "Practice area"} at work"`}
          index={1}
        />
        <TextField
          label="Display order"
          id="display_order"
          name="display_order"
          type="number"
          step="1"
          defaultValue={initial?.display_order ?? 0}
          placeholder="Lower numbers appear first"
          helper="Lower numbers appear first on the homepage; ties fall back to alphabetical order."
          index={2}
        />
        {initial?.image_url && !imageRemoved ? (
          <button
            type="button"
            onClick={removeImage}
            className="w-fit font-admin text-xs font-semibold uppercase tracking-wide text-digest-red hover:text-digest-red-deep"
          >
            Remove current image
          </button>
        ) : null}
      </FormSection>

      {state.error ? (
        <p role="alert" className="font-admin text-sm font-medium text-digest-red">
          {state.error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <SubmitButton label={submitLabel} isPending={isPending} />
        <AutosaveStatus
          status={autosave.status}
          lastSavedAt={autosave.lastSavedAt}
          errorMessage={autosave.errorMessage}
          onRetry={autosave.retry}
        />
      </div>
    </form>
  );
}
