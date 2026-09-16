"use client";

import { useActionState, useState, useCallback } from "react";
import type { IssuesArchiveRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/issues/archive/actions";
import { slugify } from "@/lib/slugify";
import {
  TextField,
  TextAreaField,
  FormSection,
} from "@/components/forms/kit/field";
import { SubmitButton } from "@/components/forms/kit/submit-button";
import { ImageUploadZone } from "@/components/forms/kit/image-upload";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

export function ArchiveIssueForm({
  action,
  initial,
  entityId,
  submitLabel,
}: {
  action: ActionFn;
  initial?: Pick<IssuesArchiveRow, "slug" | "title" | "description" | "cover_image_url" | "issue_number" | "season" | "year" | "pdf_url">;
  entityId?: string;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const [coverPreview, setCoverPreview] = useState<string | null>(initial?.cover_image_url ?? null);
  const [slugManualOverride, setSlugManualOverride] = useState(false);

  const onTitleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!slugManualOverride && !initial?.slug) {
        const slugInput = document.getElementById("slug") as HTMLInputElement | null;
        if (slugInput) slugInput.value = slugify(e.target.value);
      }
    },
    [slugManualOverride, initial?.slug],
  );

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      <FormSection title="Archive Issue" subtitle="The archived edition's identity." accent="top">
        <TextField
          label="Title"
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initial?.title}
          placeholder="e.g. Issue 38 — Spring 2026"
          onChange={onTitleChange}
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
          id="description"
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          placeholder="What's inside this edition?"
        />

        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Issue number"
            optional
            id="issue_number"
            name="issue_number"
            type="number"
            min={1}
            defaultValue={initial?.issue_number ?? ""}
            index={1}
          />
          <TextField
            label="Season"
            optional
            id="season"
            name="season"
            type="text"
            defaultValue={initial?.season ?? ""}
            placeholder="e.g. Spring"
            index={2}
          />
          <TextField
            label="Year"
            optional
            id="year"
            name="year"
            type="number"
            min={2020}
            max={2099}
            defaultValue={initial?.year ?? ""}
            index={3}
          />
        </div>
      </FormSection>

      <FormSection title="Cover Image" subtitle="The public cover for this archive issue." accent="left">
        <ImageUploadZone
          name="cover_image_file"
          label={coverPreview ? "Replace cover image" : "Upload cover image"}
          existingHiddenName="existing_cover_image_url"
          existingValue={initial?.cover_image_url ?? ""}
          initialPreview={coverPreview}
          previewAspect="aspect-[3/4]"
          compact
          onFilesSelected={(files) => setCoverPreview(URL.createObjectURL(files[0]))}
        />
      </FormSection>

      <FormSection title="Digital Edition PDF" subtitle="PDF up to 20MB. Leave empty to keep the current PDF." accent="left">
        {initial?.pdf_url ? (
          <p className="font-admin text-xs text-stone">
            Current PDF:{" "}
            <a href={initial.pdf_url} target="_blank" rel="noopener noreferrer" className="text-digest-red underline">
              View
            </a>
          </p>
        ) : null}
        <TextField
          label=""
          id="pdf_file"
          name="pdf_file"
          type="file"
          accept="application/pdf"
        />
        <input type="hidden" name="existing_pdf_url" value={initial?.pdf_url ?? ""} />
      </FormSection>

      {entityId ? <input type="hidden" name="entity_id" value={entityId} /> : null}
      {state.error ? (
        <p role="alert" className="font-admin text-sm font-medium text-digest-red">
          {state.error}
        </p>
      ) : null}

      <SubmitButton label={submitLabel} pendingLabel="Saving…" isPending={isPending} />
    </form>
  );
}
