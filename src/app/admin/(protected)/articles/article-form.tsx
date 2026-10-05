"use client";

import { useActionState, useState, useCallback, useRef } from "react";
import { motion } from "motion/react";
import type { ArticleRow, IssueRow, PracticeAreaRow, ContributorRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/articles/actions";
import {
  autosaveArticleAction,
  uploadArticleImageAction,
} from "@/app/admin/(protected)/articles/actions";
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
import { PageVisibilityField } from "@/components/forms/kit/page-visibility";
import { PageTargetingNotice } from "@/app/admin/(protected)/page-targeting-notice";
import {
  ARTICLE_PAGE_OPTIONS,
  pagesForRow,
} from "@/lib/page-visibility";
import { ImageUploadZone } from "@/components/forms/kit/image-upload";
import {
  IMAGE_POSITIONS,
  defaultPositionForSlot,
} from "@/lib/image-position";
import { useAutosave } from "@/components/forms/kit/use-autosave";
import {
  AutosaveRecoveryBanner,
  AutosaveStatus,
  SaveButtons,
} from "@/components/forms/kit/autosave-status";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

// One vocabulary for every admin form and both published-page renderers —
// see `@/lib/image-position`.
const POSITION_OPTIONS = IMAGE_POSITIONS;

export function ArticleForm({
  action,
  initial,
  initialContributorSelections,
  issues,
  practiceAreas,
  contributors,
  submitLabel,
  pageTargeting = false,
}: {
  action: ActionFn;
  pageTargeting?: boolean;
  initial?: Pick<
    ArticleRow,
    | "id"
    | "slug"
    | "title"
    | "dek"
    | "page_number"
    | "cover_image_url"
    | "show_on_pages"
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
  const formRef = useRef<HTMLFormElement>(null);
  const selections = initialContributorSelections ?? new Map<string, number>();
  const [coverPreview, setCoverPreview] = useState<string | null>(initial?.cover_image_url ?? null);
  const [slugManualOverride, setSlugManualOverride] = useState(false);

  // ── Autosave ───────────────────────────────────────────────────────────
  // Snapshots post to the server through the same reader as Save; status
  // is never written by autosave (see autosaveArticleAction). New editors
  // silently recover their last local snapshot; edit pages offer a banner.
  const autosave = useAutosave({
    formRef,
    save: (id, data) => autosaveArticleAction(id, data),
    initialId: initial?.id ?? null,
    skip: (data) => !(data.title?.[0] ?? "").trim(),
    autoRecover: !initial,
    onSlugResolved: (slug) => {
      if (initial?.slug || slugManualOverride) return;
      const slugInput = document.getElementById("slug") as HTMLInputElement | null;
      if (slugInput && !slugInput.readOnly) slugInput.value = slug;
    },
  });

  // ── Page visibility ("Display On") ──────────────────────────────────────
  // One source of truth: these keys are what gets stored in show_on_pages
  // and what the homepage/articles/issues queries filter on.
  const [pages, setPages] = useState<string[]>(() => {
    const stored = pagesForRow(initial?.show_on_pages, ARTICLE_PAGE_OPTIONS);
    if (stored) return stored;
  // Migration 0026 flipped the column default to '{homepage,articles,issues}'
  // and backfilled every published row onto the homepage, so the form now
  // defaults new editors to the homepage-eligible set. A stored value that
  // exists and excludes homepage still shows what the site does today.
  if (stored) return stored;
  return ARTICLE_PAGE_OPTIONS.map((option) => option.key);
  });

  // Homepage placement flags — ticked placement always implies "Show on
  // Homepage", and clearing "Show on Homepage" clears the placements, so
  // the form can never submit a state the homepage would contradict.
  const [placements, setPlacements] = useState({
    on_cover: initial?.on_cover ?? false,
    featured: initial?.featured ?? false,
    is_editorial_insight: initial?.is_editorial_insight ?? false,
    is_cover_story: initial?.is_cover_story ?? false,
  });

  const onPlacementChange = useCallback(
    (key: keyof typeof placements, isChecked: boolean) => {
      setPlacements((prev) => ({ ...prev, [key]: isChecked }));
      if (isChecked) {
        setPages((prev) =>
          prev.includes("homepage") ? prev : [...prev, "homepage"]
        );
      }
    },
    []
  );

  const onPageToggle = useCallback((key: string, isChecked: boolean) => {
    setPages((prev) =>
      isChecked
        ? [...new Set([...prev, key])]
        : prev.filter((page) => page !== key)
    );
    if (key === "homepage" && !isChecked) {
      setPlacements({
        on_cover: false,
        featured: false,
        is_editorial_insight: false,
        is_cover_story: false,
      });
    }
  }, []);

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
    <form ref={formRef} action={formAction} className="flex max-w-2xl flex-col gap-5">
      <input type="hidden" name="autosave_id" value={autosave.draftId ?? ""} />
      {autosave.recovery ? (
        <AutosaveRecoveryBanner
          recovery={autosave.recovery}
          onRecover={autosave.recover}
          onDismiss={autosave.dismissRecovery}
        />
      ) : null}
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

      {/* ── Publication ── */}
      <FormSection title="Publication" subtitle="Draft or published, plus the printed page number." accent="left">
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
        <p className="font-admin text-xs text-stone">
          Status: <strong className="font-semibold text-ink">{initial?.status === "published" ? "Published" : "Draft"}</strong>
          {" "}— use Publish to publish; Save never changes publication status.
        </p>
      </FormSection>

      {/* ── Display On ── */}
      {pageTargeting ? (
        <FormSection
          title="Display On"
          subtitle="Where this story is allowed to appear. The homepage only shows it when Homepage is ticked."
          accent="left"
        >
          <PageVisibilityField
            options={ARTICLE_PAGE_OPTIONS}
            selected={pages}
            checked={Object.fromEntries(
              ARTICLE_PAGE_OPTIONS.map((option) => [
                option.key,
                pages.includes(option.key),
              ])
            )}
            onToggle={onPageToggle}
          />
        </FormSection>
      ) : (
        <PageTargetingNotice />
      )}

      {/* ── Cover image ── */}
      <FormSection title="Cover Image" subtitle="The hero image shown on the homepage and article page." accent="left">
        <ImageUploadZone
          name="cover_image_file"
          label={coverPreview ? "Replace cover image" : "Upload cover image"}
          existingHiddenName="existing_cover_image_url"
          existingValue={initial?.cover_image_url ?? ""}
          initialPreview={coverPreview}
          onFilesSelected={(files) => setCoverPreview(URL.createObjectURL(files[0]))}
          upload={uploadArticleImageAction}
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
                    upload={uploadArticleImageAction}
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
                  defaultValue={initial?.[posKey] ?? defaultPositionForSlot(num)}
                  index={i}
                >
                  {POSITION_OPTIONS.map((pos) => (
                    <option key={pos.value} value={pos.value}>{pos.label}</option>
                  ))}
                </SelectField>
              </div>
            </motion.div>
          );
        })}
      </FormSection>

      {/* ── Editorial information ── */}
      <FormSection title="Editorial Information" subtitle="Issue and practice area." accent="left">
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
      </FormSection>

      {/* ── Homepage placement ── */}
      <FormSection
        title="Homepage Placement"
        subtitle={'Which homepage section shows this story. Tick one — "Show on Homepage" switches on automatically.'}
        accent="left"
      >
        <div className="flex flex-col gap-1">
          <CheckboxField
            name="on_cover"
            label="In This Issue"
            description="Cover teaser strip"
            checked={placements.on_cover}
            onChange={(isChecked) => onPlacementChange("on_cover", isChecked)}
            index={0}
          />
          <CheckboxField
            name="featured"
            label="Featured Story"
            checked={placements.featured}
            onChange={(isChecked) => onPlacementChange("featured", isChecked)}
            index={1}
          />
          <CheckboxField
            name="is_editorial_insight"
            label="Editorial Insights"
            checked={placements.is_editorial_insight}
            onChange={(isChecked) =>
              onPlacementChange("is_editorial_insight", isChecked)
            }
            index={2}
          />
          <CheckboxField
            name="is_cover_story"
            label="Cover Story"
            description="Only one at a time — setting this unsets the previous"
            checked={placements.is_cover_story}
            onChange={(isChecked) =>
              onPlacementChange("is_cover_story", isChecked)
            }
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

      <SaveButtons
        formRef={formRef}
        flush={autosave.flush}
        isPending={isPending}
        saveLabel={submitLabel}
        publishLabel={initial?.status === "published" ? "Save & Publish" : "Publish"}
        showPublish
        showUnpublish={initial?.status === "published"}
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
