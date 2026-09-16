"use client";

import { useActionState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { HomepageHighlightRow } from "@/lib/supabase/types";
import type { FormState } from "./actions";
import {
  TextField,
  TextAreaField,
  FormSection,
} from "@/components/forms/kit/field";
import { SubmitButton } from "@/components/forms/kit/submit-button";
import { ImageUploadZone } from "@/components/forms/kit/image-upload";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

function RadioOption({
  name,
  value,
  defaultChecked,
  children,
}: {
  name: string;
  value: string;
  defaultChecked?: boolean;
  children: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <label className="group flex cursor-pointer items-center gap-2.5">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="h-4 w-4 accent-[#A51C30]"
      />
      <motion.span
        whileHover={reduce ? undefined : { x: 2 }}
        className="font-admin text-sm text-ink transition-colors group-hover:text-digest-red"
      >
        {children}
      </motion.span>
    </label>
  );
}

export function HighlightForm({
  action,
  initial,
  submitLabel,
  entityId,
}: {
  action: ActionFn;
  initial?: Pick<HomepageHighlightRow, "title" | "content" | "caption" | "category" | "image_url" | "image_position" | "published" | "display_order">;
  submitLabel: string;
  entityId?: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-5">
      {entityId ? <input type="hidden" name="entity_id" value={entityId} /> : null}

      <FormSection title="Image" subtitle="Required — the visual for this highlight." accent="top">
        <ImageUploadZone
          name="image_file"
          label={initial?.image_url ? "Replace image" : "Upload image"}
          existingHiddenName="existing_image_url"
          existingValue={initial?.image_url ?? ""}
          previewAspect="aspect-[16/9]"
        />
        <p className="font-admin text-xs text-stone">
          JPEG, PNG, WEBP, or GIF, up to 5MB. Leave empty to keep current image.
        </p>
      </FormSection>

      <FormSection title="Layout" subtitle="Where the image sits relative to the text." accent="left">
        <div className="flex gap-6">
          <RadioOption
            name="image_position"
            value="left"
            defaultChecked={(initial?.image_position ?? "left") === "left"}
          >
            Image Left
          </RadioOption>
          <RadioOption
            name="image_position"
            value="right"
            defaultChecked={initial?.image_position === "right"}
          >
            Image Right
          </RadioOption>
        </div>
      </FormSection>

      <FormSection title="Content" subtitle="The highlight copy. All text fields are optional." accent="left">
        <TextField
          label="Title"
          optional
          id="title"
          name="title"
          type="text"
          defaultValue={initial?.title ?? ""}
          placeholder="e.g. The Supreme Court of Nigeria"
          index={0}
        />
        <TextAreaField
          label="Content"
          optional
          id="content"
          name="content"
          rows={4}
          defaultValue={initial?.content ?? ""}
          placeholder="The highlight content, fact, or editorial note…"
        />
        <TextField
          label="Caption"
          optional
          id="caption"
          name="caption"
          type="text"
          defaultValue={initial?.caption ?? ""}
          placeholder="Short caption for image or section"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Category"
            optional
            id="category"
            name="category"
            type="text"
            defaultValue={initial?.category ?? ""}
            placeholder="e.g. Legal Fact, Quote, Spotlight"
            index={1}
          />
          <TextField
            label="Display order"
            id="display_order"
            name="display_order"
            type="number"
            min={0}
            step={1}
            defaultValue={initial?.display_order ?? 0}
            index={2}
          />
        </div>
        <label className="flex cursor-pointer items-center gap-3 pt-1">
          <input
            type="checkbox"
            name="published"
            defaultChecked={initial?.published ?? true}
            className="h-4 w-4 accent-[#A51C30]"
          />
          <span className="font-admin text-sm font-medium text-ink">Published</span>
        </label>
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
