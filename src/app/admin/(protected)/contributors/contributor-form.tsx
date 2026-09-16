"use client";

import { useActionState, useState, useCallback } from "react";
import type { ContributorRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/contributors/actions";
import { slugify } from "@/lib/slugify";
import {
  TextField,
  TextAreaField,
  CheckboxField,
  FormSection,
} from "@/components/forms/kit/field";
import { SubmitButton } from "@/components/forms/kit/submit-button";
import { ImageUploadZone } from "@/components/forms/kit/image-upload";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

export function ContributorForm({
  action,
  initial,
  submitLabel,
}: {
  action: ActionFn;
  initial?: Pick<
    ContributorRow,
    "slug" | "name" | "credentials" | "role" | "bio" | "photo_url" | "is_editorial_board"
  >;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const [photoPreview, setPhotoPreview] = useState<string | null>(initial?.photo_url ?? null);
  const [slugManualOverride, setSlugManualOverride] = useState(false);

  const onNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!slugManualOverride && !initial?.slug) {
        const slugInput = document.getElementById("slug") as HTMLInputElement | null;
        if (slugInput) slugInput.value = slugify(e.target.value);
      }
    },
    [slugManualOverride, initial?.slug],
  );

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-5">
      <FormSection title="Profile" subtitle="Who this person is and how they appear on the masthead." accent="top">
        <TextField
          label="Name"
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initial?.name}
          onChange={onNameChange}
          placeholder="Full name"
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
              <p className="mt-1.5 font-admin text-xs text-stone">
                Existing slug — preserved to keep the public URL stable.
              </p>
            </>
          ) : (
            <>
              <input
                id="slug"
                name="slug"
                type="text"
                required
                placeholder="auto-generated-from-name"
                onChange={() => setSlugManualOverride(true)}
                className="mt-1.5 w-full border border-hairline bg-white px-4 py-3 font-admin text-sm text-ink"
                style={{ borderRadius: 2 }}
              />
              <p className="mt-1.5 font-admin text-xs text-stone">
                Auto-generated from the name. Edit manually only if needed.
              </p>
            </>
          )}
        </div>

        <TextField
          label="Role"
          name="role"
          type="text"
          required
          defaultValue={initial?.role}
          placeholder="e.g. Contributor, Editor-in-Chief"
        />

        <TextField
          label="Credentials"
          optional
          name="credentials"
          type="text"
          defaultValue={initial?.credentials ?? ""}
          placeholder="e.g. SAN, LL.M"
        />

        <TextAreaField
          label="Bio"
          optional
          name="bio"
          rows={3}
          defaultValue={initial?.bio ?? ""}
          placeholder="A short professional biography…"
        />
      </FormSection>

      <FormSection title="Profile Photo" subtitle="Shown on the contributor page and bylines." accent="left">
        <ImageUploadZone
          name="photo_file"
          label={photoPreview ? "Replace photo" : "Upload profile photo"}
          existingHiddenName="existing_photo_url"
          existingValue={initial?.photo_url ?? ""}
          initialPreview={photoPreview}
          previewAspect="aspect-square"
          compact
          onFilesSelected={(files) => setPhotoPreview(URL.createObjectURL(files[0]))}
        />
        <p className="font-admin text-xs text-stone">
          JPEG, PNG, WEBP, or GIF, up to 5MB. Leave empty to keep the current photo.
        </p>
      </FormSection>

      <FormSection title="Masthead" subtitle="How this person is classified." accent="left">
        <CheckboxField
          name="is_editorial_board"
          label="Editorial board member"
          description="vs. article contributor"
          defaultChecked={initial?.is_editorial_board}
        />
      </FormSection>

      {state.error ? (
        <p role="alert" className="font-admin text-sm font-medium text-digest-red">
          {state.error}
        </p>
      ) : null}

      <SubmitButton label={submitLabel} pendingLabel="Saving…" isPending={isPending} />
    </form>
  );
}
