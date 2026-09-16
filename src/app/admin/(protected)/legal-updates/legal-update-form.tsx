"use client";

import { useActionState } from "react";
import { motion } from "motion/react";
import type { LegalUpdateRow, PracticeAreaRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/legal-updates/actions";
import { TiptapEditor } from "@/app/admin/(protected)/articles/tiptap-editor";
import type { JSONContent } from "@tiptap/core";
import {
  TextField,
  TextAreaField,
  SelectField,
  FormSection,
  fieldEntrance,
} from "@/components/forms/kit/field";
import { SubmitButton } from "@/components/forms/kit/submit-button";
import { ImageUploadZone } from "@/components/forms/kit/image-upload";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

const POSITION_OPTIONS = [
  ["top-right", "Top / Right"],
  ["top-left", "Top / Left"],
  ["bottom-right", "Bottom / Right"],
  ["bottom-left", "Bottom / Left"],
  ["center-right", "Centre / Right"],
  ["center-left", "Centre / Left"],
  ["full-width", "Full Width"],
] as const;

const DEFAULT_POSITIONS = ["top-right", "bottom-left", "center-right", "center-left"] as const;

function InlineImageField({
  num,
  initial,
}: {
  num: 1 | 2 | 3 | 4;
  initial?: Pick<
    LegalUpdateRow,
    | "image_1_url" | "image_1_alt" | "image_1_position"
    | "image_2_url" | "image_2_alt" | "image_2_position"
    | "image_3_url" | "image_3_alt" | "image_3_position"
    | "image_4_url" | "image_4_alt" | "image_4_position"
  >;
}) {
  const posKey = `image_${num}_position` as const;
  const urlKey = `image_${num}_url` as const;
  const altKey = `image_${num}_alt` as const;
  return (
    <motion.div
      {...fieldEntrance}
      className="grid gap-3 border-t border-hairline/70 pt-4 sm:grid-cols-[1fr_170px]"
    >
      <div>
        <span className="font-admin text-[11px] font-semibold uppercase tracking-[0.12em] text-stone">
          Image {num}
        </span>
        <div className="mt-1.5">
          <ImageUploadZone
            name={`image_${num}_file`}
            label={`Image ${num}`}
            existingHiddenName={`existing_${urlKey}`}
            existingValue={initial?.[urlKey] ?? ""}
            compact
            previewAspect="aspect-[16/9]"
          />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <TextField
          label="Alt text"
          name={altKey}
          type="text"
          defaultValue={initial?.[altKey] ?? ""}
          placeholder="Describe the image…"
        />
        <SelectField
          label="Position"
          name={posKey}
          defaultValue={initial?.[posKey] ?? DEFAULT_POSITIONS[num - 1]}
        >
          {POSITION_OPTIONS.map(([value, text]) => (
            <option key={value} value={value}>{text}</option>
          ))}
        </SelectField>
      </div>
    </motion.div>
  );
}

export function LegalUpdateForm({
  action,
  initial,
  practiceAreas,
  submitLabel,
}: {
  action: ActionFn;
  initial?: Pick<
    LegalUpdateRow,
    "headline" | "slug" | "summary" | "source_name" | "body" | "cover_image_url"
    | "image_1_url" | "image_1_alt" | "image_1_position"
    | "image_2_url" | "image_2_alt" | "image_2_position"
    | "image_3_url" | "image_3_alt" | "image_3_position"
    | "image_4_url" | "image_4_alt" | "image_4_position"
    | "practice_area_id" | "status"
  >;
  practiceAreas: PracticeAreaRow[];
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });

  const initialBody: JSONContent | null =
    initial?.body && typeof initial.body === "object" ? (initial.body as JSONContent) : null;

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      <FormSection title="Update Details" subtitle="The headline and summary readers see first." accent="top">
        <TextField
          label="Headline"
          id="headline"
          name="headline"
          type="text"
          required
          defaultValue={initial?.headline}
          placeholder="Enter the breaking-news headline…"
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
                placeholder="auto-generated-from-headline"
                className="mt-1.5 w-full border border-hairline bg-white px-4 py-3 font-admin text-sm text-ink"
                style={{ borderRadius: 2 }}
              />
              <p className="mt-1.5 font-admin text-xs text-stone">
                Auto-generated from the headline if left empty.
              </p>
            </>
          )}
        </div>

        <TextAreaField
          label="Summary"
          optional
          name="summary"
          rows={3}
          defaultValue={initial?.summary ?? ""}
          placeholder="Give readers a concise overview of this update…"
        />

        <TextField
          label="Source name"
          name="source_name"
          type="text"
          required
          defaultValue={initial?.source_name}
          placeholder="e.g. CityLawyerMag"
        />
      </FormSection>

      <FormSection title="Cover Image" subtitle="The hero image for this update." accent="left">
        <ImageUploadZone
          name="cover_image_file"
          label="Upload cover image"
          existingHiddenName="existing_cover_image_url"
          existingValue={initial?.cover_image_url ?? ""}
          previewAspect="aspect-[16/9]"
        />
        <p className="font-admin text-xs text-stone">
          {initial?.cover_image_url ? "Leave empty to keep the current image." : "JPEG, PNG, WEBP, or GIF, up to 5MB."}
        </p>
      </FormSection>

      <FormSection
        title="Article Images"
        subtitle="Position up to 4 images within the content. They are distributed editorially through the text."
        accent="left"
      >
        <InlineImageField num={1} initial={initial} />
        <InlineImageField num={2} initial={initial} />
        <InlineImageField num={3} initial={initial} />
        <InlineImageField num={4} initial={initial} />
      </FormSection>

      <FormSection title="Full Content" subtitle="The body of the update." accent="left">
        <TiptapEditor name="body" initialContent={initialBody} />
      </FormSection>

      <FormSection title="Classification" subtitle="Practice area and review status." accent="left">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Practice area"
            optional
            id="practice_area_id"
            name="practice_area_id"
            defaultValue={initial?.practice_area_id ?? ""}
            index={0}
          >
            <option value="">None</option>
            {practiceAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Status"
            id="status"
            name="status"
            defaultValue={initial?.status ?? "pending_review"}
            index={1}
          >
            <option value="pending_review">Pending review</option>
            <option value="published">Published</option>
            <option value="rejected">Rejected</option>
          </SelectField>
        </div>
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
