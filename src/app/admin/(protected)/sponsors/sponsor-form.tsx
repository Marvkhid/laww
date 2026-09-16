"use client";

import { useActionState, useState } from "react";
import type { SponsorRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/sponsors/actions";
import {
  TextField,
  SelectField,
  CheckboxField,
  FormSection,
} from "@/components/forms/kit/field";
import { SubmitButton } from "@/components/forms/kit/submit-button";
import { ImageUploadZone } from "@/components/forms/kit/image-upload";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

export function SponsorForm({
  action,
  initial,
  submitLabel,
}: {
  action: ActionFn;
  initial?: Pick<
    SponsorRow,
    "name" | "logo_url" | "website_url" | "tier" | "placement" | "image_url" | "display_order" | "page_number" | "active"
  >;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const [logoPreview, setLogoPreview] = useState<string | null>(initial?.logo_url ?? null);
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.image_url ?? null);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-5">
      <FormSection title="Sponsor" subtitle="Identity and placement of this sponsor." accent="top">
        <TextField
          label="Name"
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initial?.name}
          placeholder="Sponsor or firm name"
          index={0}
        />
        <TextField
          label="Website URL"
          optional
          id="website_url"
          name="website_url"
          type="url"
          defaultValue={initial?.website_url ?? ""}
          placeholder="https://…"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Tier"
            optional
            id="tier"
            name="tier"
            type="text"
            defaultValue={initial?.tier ?? ""}
            placeholder="e.g. Platinum"
            index={1}
          />
          <SelectField
            label="Placement"
            id="placement"
            name="placement"
            defaultValue={initial?.placement ?? "all"}
            index={2}
          >
            <option value="all">All pages</option>
            <option value="homepage">Homepage only</option>
            <option value="article_page">Article pages</option>
            <option value="sidebar">Sidebar</option>
          </SelectField>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Display order"
            id="display_order"
            name="display_order"
            type="number"
            step="1"
            defaultValue={initial?.display_order ?? 0}
            index={3}
          />
          <TextField
            label="Page number"
            optional
            id="sponsor_page_number"
            name="page_number"
            type="number"
            min={1}
            step={1}
            defaultValue={initial?.page_number ?? ""}
            placeholder="e.g. 5"
            index={4}
          />
        </div>
      </FormSection>

      <FormSection title="Logo Image" subtitle="Shown in sponsor strips and listings." accent="left">
        <ImageUploadZone
          name="logo_file"
          label={logoPreview ? "Replace logo" : "Upload logo"}
          existingHiddenName="existing_logo_url"
          existingValue={initial?.logo_url ?? ""}
          initialPreview={logoPreview}
          previewAspect="aspect-[16/9]"
          compact
          onFilesSelected={(files) => setLogoPreview(URL.createObjectURL(files[0]))}
        />
        <p className="font-admin text-xs text-stone">
          {initial?.logo_url ? "Leave empty to keep the current logo." : "JPEG, PNG, WEBP, or GIF, up to 5MB."}
        </p>
      </FormSection>

      <FormSection title="Banner Ad Image" subtitle="Wider banner image for ad placements." accent="left">
        <ImageUploadZone
          name="image_file"
          label={imagePreview ? "Replace banner" : "Upload banner"}
          existingHiddenName="existing_image_url"
          existingValue={initial?.image_url ?? ""}
          initialPreview={imagePreview}
          previewAspect="aspect-[16/9]"
          onFilesSelected={(files) => setImagePreview(URL.createObjectURL(files[0]))}
        />
        <p className="font-admin text-xs text-stone">
          {initial?.image_url ? "Leave empty to keep the current banner." : "Optional."}
        </p>
      </FormSection>

      <FormSection title="Visibility" accent="left">
        <CheckboxField
          name="active"
          label="Active"
          description="Visible on the public site"
          defaultChecked={initial?.active ?? true}
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
