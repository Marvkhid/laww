"use client";

import { useActionState, useState, useCallback } from "react";
import { motion } from "motion/react";
import type { ArticleRow, IssueRow, PracticeAreaRow, ContributorRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/articles/actions";
import { TiptapEditor } from "@/app/admin/(protected)/articles/tiptap-editor";
import { slugify } from "@/lib/slugify";
import {
  TextField,
  TextAreaField,
  SelectField,
  CheckboxField,
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

export function ArticleForm({
  action,
  initial,
  initialContributorSelections,
  issues,
  practiceAreas,
  contributors,
  submitLabel,
}: {
  action: ActionFn;
  initial?: Pick<
    ArticleRow,
    | "slug"
    | "title"
    | "dek"
    | "page_number"
    | "cover_image_url"
    | "image_1_url"
    | "image_1_alt"
    | "image_1_position"
    | "image_2_url"
    | "image_2_alt"
    | "image_2_position"
    | "image_3_url"
    | "image_3_alt"
    | "image_3_position"
    | "image_4_url"
    | "image_4_alt"
    | "image_4_position"
    | "status"
    | "featured"
    | "is_editorial_insight"
    | "on_cover"
    | "is_cover_story"
    | "issue_id"
    | "practice_area_id"
    | "body"
  >;
  initialContributorSelections?: Map<string, number>; // contributorId -> author_order
  issues: IssueRow[];
  practiceAreas: PracticeAreaRow[];
  contributors: ContributorRow[];
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const selections = initialContributorSelections ?? new Map<string, number>();
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
      {/* ── Article details ── */}
      <FormSection title="Article Details" subtitle="The headline and metadata that define this story." accent="top">
        <TextField
          label="Title"
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initial?.title}
          onChange={onTitleChange}
          placeholder="Enter the article headline…"
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
                placeholder="auto-generated-from-title"
                onChange={() => setSlugManualOverride(true)}
                className="mt-1.5 w-full border border-hairline bg-white px-4 py-3 font-admin text-sm text-ink"
                style={{ borderRadius: 2 }}
              />
              <p className="mt-1.5 font-admin text-xs text-stone">
                Auto-generated from the title. Edit manually only if needed.
              </p>
            </>
          )}
        </div>

        <TextAreaField
          label="Dek"
          optional
          name="dek"
          rows={2}
          defaultValue={initial?.dek ?? ""}
          placeholder="A short standfirst beneath the headline…"
          index={2}
        />
      </FormSection>

      {/* ── Body ── */}
      <FormSection title="Body" subtitle="Write the story with the rich text editor." accent="left">
        <div>
          <div className="mb-1.5">
            <span className="font-admin text-[11px] font-semibold uppercase tracking-[0.12em] text-stone">
              Content <span className="normal-case tracking-normal text-stone/70">(optional)</span>
            </span>
          </div>
          <TiptapEditor name="body" initialContent={initial?.body} />
        </div>
      </FormSection>

      {/* ── Publishing ── */}
      <FormSection title="Publishing" subtitle="Status and in-issue placement." accent="left">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Page number"
            optional
            id="page_number"
            name="page_number"
            type="number"
            min={1}
            step={1}
            defaultValue={initial?.page_number ?? ""}
            index={0}
          />
          <SelectField
            label="Status"
            id="status"
            name="status"
            defaultValue={initial?.status ?? "draft"}
            index={1}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </SelectField>
        </div>
      </FormSection>

      {/* ── Cover image ── */}
      <FormSection title="Cover Image" subtitle="The hero image shown on the homepage and article page." accent="left">
        <ImageUploadZone
          name="cover_image_file"
          label={coverPreview ? "Replace cover image" : "Upload cover image"}
          existingHiddenName="existing_cover_image_url"
          existingValue={initial?.cover_image_url ?? ""}
          initialPreview={coverPreview}
          onFilesSelected={(files) => setCoverPreview(URL.createObjectURL(files[0]))}
        />
        <p className="font-admin text-xs text-stone">
          {initial?.cover_image_url ? "Leave empty to keep the current image." : "JPEG, PNG, WEBP, or GIF, up to 5MB."}
        </p>
      </FormSection>

      {/* ── Inline article images ── */}
      <FormSection
        title="Article Images"
        subtitle="Position up to 4 images within the article content. Leave empty to skip."
        accent="left"
      >
        {([1, 2, 3, 4] as const).map((num, i) => {
          const posKey = `image_${num}_position` as const;
          const urlKey = `image_${num}_url` as const;
          const altKey = `image_${num}_alt` as const;
          return (
            <motion.div
              key={num}
              {...fieldEntrance}
              transition={{ ...fieldEntrance.transition, delay: i * 0.05 }}
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
                  index={i}
                />
                <SelectField
                  label="Position"
                  name={posKey}
                  defaultValue={initial?.[posKey] ?? DEFAULT_POSITIONS[num - 1]}
                  index={i}
                >
                  {POSITION_OPTIONS.map(([value, text]) => (
                    <option key={value} value={value}>{text}</option>
                  ))}
                </SelectField>
              </div>
            </motion.div>
          );
        })}
      </FormSection>

      {/* ── Editorial information ── */}
      <FormSection title="Editorial Information" subtitle="Issue, practice area, and homepage placement." accent="left">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Issue"
            optional
            id="issue_id"
            name="issue_id"
            defaultValue={initial?.issue_id ?? ""}
            index={0}
          >
            <option value="">None</option>
            {issues.map((issue) => (
              <option key={issue.id} value={issue.id}>
                Issue {issue.issue_number} — {issue.season} {issue.year}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Practice area"
            optional
            id="practice_area_id"
            name="practice_area_id"
            defaultValue={initial?.practice_area_id ?? ""}
            index={1}
          >
            <option value="">None</option>
            {practiceAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="flex flex-col gap-1 border-t border-hairline/70 pt-3">
          <span className="mb-1 font-admin text-[11px] font-semibold uppercase tracking-[0.12em] text-stone">
            Homepage placement
          </span>
          <CheckboxField
            name="on_cover"
            label="In This Issue"
            description="Cover teaser strip"
            defaultChecked={initial?.on_cover}
            index={0}
          />
          <CheckboxField
            name="featured"
            label="Featured Stories"
            defaultChecked={initial?.featured}
            index={1}
          />
          <CheckboxField
            name="is_editorial_insight"
            label="Editorial Insights"
            defaultChecked={initial?.is_editorial_insight}
            index={2}
          />
          <CheckboxField
            name="is_cover_story"
            label="Cover Story"
            description="Only one at a time — setting this unsets the previous"
            defaultChecked={initial?.is_cover_story}
            index={3}
          />
        </div>
      </FormSection>

      {/* ── Authors ── */}
      <FormSection
        title="Authors"
        subtitle="Check who's credited. The number sets byline order (1 = first author) — only used when more than one is selected."
        accent="left"
      >
        <div className="flex flex-col divide-y divide-hairline/60">
          {contributors.map((person, i) => (
            <motion.div
              key={person.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
              className="flex items-center gap-3 py-2"
            >
              <CheckboxField
                name={`contributor_${person.id}`}
                label={
                  person.name + (person.is_editorial_board ? "  (Editorial Board)" : "")
                }
                defaultChecked={selections.has(person.id)}
                index={0}
              />
              <input
                type="number"
                name={`order_${person.id}`}
                min={1}
                step={1}
                defaultValue={selections.get(person.id) ?? 1}
                className="ml-auto w-16 border border-hairline bg-white px-2 py-1.5 font-admin text-xs text-ink"
                style={{ borderRadius: 2 }}
                aria-label={`Byline order for ${person.name}`}
              />
            </motion.div>
          ))}
        </div>
      </FormSection>

      {state.error ? (
        <p role="alert" className="font-admin text-sm font-medium text-digest-red">
          {state.error}
        </p>
      ) : null}

      <SubmitButton
        label={submitLabel}
        pendingLabel="Saving…"
        isPending={isPending}
      />
    </form>
  );
}
