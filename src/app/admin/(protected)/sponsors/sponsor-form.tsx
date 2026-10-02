"use client";

import { useActionState, useState } from "react";
import type { SponsorRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/sponsors/actions";
import {
  TextField,
  CheckboxField,
  FormSection,
} from "@/components/forms/kit/field";
import { SubmitButton } from "@/components/forms/kit/submit-button";
import { ImageUploadZone } from "@/components/forms/kit/image-upload";
import { PageVisibilityField } from "@/components/forms/kit/page-visibility";
import { PageTargetingNotice } from "@/app/admin/(protected)/page-targeting-notice";
import {
  ADVERT_PAGE_OPTIONS,
  pagesFromLegacyPlacement,
  pagesForRow,
} from "@/lib/page-visibility";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

export function SponsorForm({
  action,
  initial,
  submitLabel,
  pageTargeting = false,
}: {
  action: ActionFn;
  initial?: Pick<
    SponsorRow,
    | "name"
    | "logo_url"
    | "website_url"
    | "tier"
    | "placement"
    | "image_url"
    | "show_on_pages"
    | "display_order"
    | "page_number"
    | "active"
  >;
  submitLabel: string;
  pageTargeting?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const [logoPreview, setLogoPreview] = useState<string | null>(initial?.logo_url ?? null);
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.image_url ?? null);

  // Where this advert may appear. Falls back to the legacy `placement`
  // column for rows saved before migration 0025; new adverts default to the
  // homepage only — never every page at once.
  const selectedPages = initial
    ? (pagesForRow(initial.show_on_pages) ??
      pagesFromLegacyPlacement(initial.placement))
    : ["homepage"];

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-5">
      <FormSection title="Advert" subtitle="The advertisement's name and details." accent="top">
        <TextField
          label="Advert title"
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initial?.name}
          placeholder="e.g. MTN Diaspora Campaign"
          helper="Shown as the advert's label — use the sponsor or campaign name."
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
          <TextField
            label="Display order"
            id="display_order"
            name="display_order"
            type="number"
            step="1"
            defaultValue={initial?.display_order ?? 0}
            index={2}
          />
        </div>
        <TextField
          label="Page number"
          optional
          id="sponsor_page_number"
          name="page_number"
          type="number"
          min={1}
          step="1"
          defaultValue={initial?.page_number ?? ""}
          placeholder="e.g. 5"
          index={3}
        />
      </FormSection>

      <FormSection
        title="Advert Image"
        subtitle="The advertisement artwork shown on the selected pages."
        accent="left"
      >
        <ImageUploadZone
          name="image_file"
          label={imagePreview ? "Replace advert image" : "Upload advert image"}
          existingHiddenName="existing_image_url"
          existingValue={initial?.image_url ?? ""}
          initialPreview={imagePreview}
          previewAspect="aspect-[16/9]"
          onFilesSelected={(files) => setImagePreview(URL.createObjectURL(files[0]))}
        />
        <p className="font-admin text-xs text-stone">
          JPEG, PNG, WEBP, or GIF, up to 5MB.{" "}
          {initial?.image_url
            ? "Leave empty to keep the current image."
            : "This is the artwork readers see in the ad slot."}
        </p>
      </FormSection>

      <FormSection
        title="Logo (optional)"
        subtitle="Small brand mark used in the Supporting Law Digest strip."
        accent="left"
      >
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

      {pageTargeting ? (
        <FormSection
          title="Display On"
          subtitle="Tick every page this advert should appear on. One advert per slot — pages never stack adverts side by side."
          accent="left"
        >
          <PageVisibilityField
            options={ADVERT_PAGE_OPTIONS}
            selected={selectedPages}
          />
        </FormSection>
      ) : (
        <PageTargetingNotice />
      )}

      <FormSection title="Visibility" accent="left">
        <CheckboxField
          name="active"
          label="Active / published"
          description="Only active adverts appear on the public site"
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
