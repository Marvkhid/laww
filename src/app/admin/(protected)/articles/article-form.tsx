"use client";

import { useActionState, useState } from "react";
import type { ArticleRow, IssueRow, PracticeAreaRow, ContributorRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/articles/actions";
import { TiptapEditor } from "@/app/admin/(protected)/articles/tiptap-editor";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

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

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      <div>
        <label htmlFor="title" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Title
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          defaultValue={initial?.title}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div>
        <label htmlFor="slug" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          required
          defaultValue={initial?.slug}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
        <p className="mt-1 font-admin text-xs text-[#333]">
          Sets the public URL at /articles/[slug] — edited directly, not generated from the
          title.
        </p>
      </div>
      <div>
        <label htmlFor="dek" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Dek <span className="normal-case text-[#333]">(optional)</span>
        </label>
        <textarea
          id="dek"
          name="dek"
          rows={2}
          defaultValue={initial?.dek ?? ""}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div>
        <label className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Body <span className="normal-case text-[#333]">(optional)</span>
        </label>
        <div className="mt-1">
          <TiptapEditor name="body" initialContent={initial?.body} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="page_number"
            className="font-admin text-xs font-medium uppercase tracking-wide text-ink"
          >
            Page number <span className="normal-case text-[#333]">(optional)</span>
          </label>
          <input
            id="page_number"
            name="page_number"
            type="number"
            min={1}
            step={1}
            defaultValue={initial?.page_number ?? ""}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          />
        </div>
        <div>
          <label htmlFor="status" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={initial?.status ?? "draft"}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </div>
      </div>
      <div>
        <label
          htmlFor="cover_image_file"
          className="font-admin text-xs font-medium uppercase tracking-wide text-ink"
        >
          Cover image <span className="normal-case text-[#333]">(optional)</span>
        </label>
        {coverPreview ? (
          <div className="mt-2 aspect-[16/10] w-full max-w-xs overflow-hidden border border-hairline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPreview} alt="Cover preview" className="h-full w-full object-cover" />
          </div>
        ) : null}
        <input
          id="cover_image_file"
          name="cover_image_file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) setCoverPreview(URL.createObjectURL(file));
          }}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
        <input
          type="hidden"
          name="existing_cover_image_url"
          value={initial?.cover_image_url ?? ""}
        />
        <p className="mt-1 font-admin text-xs text-[#333]">
          JPEG, PNG, WEBP, or GIF, up to 5MB.
          {initial?.cover_image_url ? " Leave empty to keep the current image." : ""}
        </p>
      </div>

      {/* Inline Article Images */}
      <fieldset className="flex flex-col gap-4 border border-hairline p-4">
        <legend className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Article Images <span className="normal-case text-[#333]">(optional, up to 4)</span>
        </legend>
        <p className="font-admin text-xs text-[#333]">
          Position images within the article content. Leave empty to skip.
        </p>
        {([1, 2, 3, 4] as const).map((num) => {
          const posKey = `image_${num}_position` as const;
          const urlKey = `image_${num}_url` as const;
          const altKey = `image_${num}_alt` as const;
          return (
            <div key={num} className="grid grid-cols-[1fr_140px] gap-3 border-t border-hairline/60 pt-3">
              <div>
                <label htmlFor={`image_${num}_file`} className="font-admin text-[10px] font-medium uppercase tracking-wide text-ink">
                  Image {num}
                </label>
                <input
                  id={`image_${num}_file`}
                  name={`image_${num}_file`}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="mt-1 w-full border border-[#c8c3bb] bg-white px-3 py-2 font-admin text-xs text-ink"
                />
                <input type="hidden" name={`existing_${urlKey}`} value={initial?.[urlKey] ?? ""} />
              </div>
              <div className="flex flex-col gap-2">
                <div>
                  <label htmlFor={`image_${num}_alt`} className="font-admin text-[10px] font-medium uppercase tracking-wide text-ink">
                    Alt text
                  </label>
                  <input
                    id={`image_${num}_alt`}
                    name={altKey}
                    type="text"
                    defaultValue={initial?.[altKey] ?? ""}
                    placeholder="Image description"
                    className="mt-1 w-full border border-[#c8c3bb] bg-white px-3 py-2 font-admin text-xs text-ink"
                  />
                </div>
                <div>
                  <label htmlFor={posKey} className="font-admin text-[10px] font-medium uppercase tracking-wide text-ink">
                    Position
                  </label>
                  <select
                    id={posKey}
                    name={posKey}
                    defaultValue={initial?.[posKey] ?? (num === 1 ? "top-right" : num === 2 ? "bottom-left" : num === 3 ? "center-right" : "center-left")}
                    className="mt-1 w-full border border-[#c8c3bb] bg-white px-3 py-2 font-admin text-xs text-ink"
                  >
                    <option value="top-right">Top / Right</option>
                    <option value="top-left">Top / Left</option>
                    <option value="bottom-right">Bottom / Right</option>
                    <option value="bottom-left">Bottom / Left</option>
                    <option value="center-right">Centre / Right</option>
                    <option value="center-left">Centre / Left</option>
                    <option value="full-width">Full Width</option>
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </fieldset>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="issue_id" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
            Issue <span className="normal-case text-[#333]">(optional)</span>
          </label>
          <select
            id="issue_id"
            name="issue_id"
            defaultValue={initial?.issue_id ?? ""}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          >
            <option value="">None</option>
            {issues.map((issue) => (
              <option key={issue.id} value={issue.id}>
                Issue {issue.issue_number} — {issue.season} {issue.year}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="practice_area_id"
            className="font-admin text-xs font-medium uppercase tracking-wide text-ink"
          >
            Practice area <span className="normal-case text-[#333]">(optional)</span>
          </label>
          <select
            id="practice_area_id"
            name="practice_area_id"
            defaultValue={initial?.practice_area_id ?? ""}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          >
            <option value="">None</option>
            {practiceAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <fieldset className="flex flex-col gap-2 border border-hairline p-4">
        <legend className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Homepage placement
        </legend>
        <label className="flex items-center gap-2 font-admin text-sm text-ink">
          <input type="checkbox" name="on_cover" defaultChecked={initial?.on_cover} />
          In This Issue (cover teaser strip)
        </label>
        <label className="flex items-center gap-2 font-admin text-sm text-ink">
          <input type="checkbox" name="featured" defaultChecked={initial?.featured} />
          Featured Stories
        </label>
        <label className="flex items-center gap-2 font-admin text-sm text-ink">
          <input
            type="checkbox"
            name="is_editorial_insight"
            defaultChecked={initial?.is_editorial_insight}
          />
          Editorial Insights
        </label>
        <label className="flex items-center gap-2 font-admin text-sm text-ink">
          <input
            type="checkbox"
            name="is_cover_story"
            defaultChecked={initial?.is_cover_story}
          />
          Cover Story (only one at a time — setting this unsets the previous)
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-3 border border-hairline p-4">
        <legend className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Contributors
        </legend>
        <p className="font-admin text-xs text-[#333]">
          Check who&rsquo;s credited. The number sets byline order (1 = first author) — only
          used when more than one is selected.
        </p>
        {contributors.map((person) => (
          <div key={person.id} className="flex items-center gap-3">
            <input
              type="checkbox"
              id={`contributor_${person.id}`}
              name={`contributor_${person.id}`}
              defaultChecked={selections.has(person.id)}
              className="shrink-0"
            />
            <label htmlFor={`contributor_${person.id}`} className="flex-1 font-admin text-sm text-ink">
              {person.name}
              {person.is_editorial_board ? (
                <span className="ml-1 text-[#333]">(Editorial Board)</span>
              ) : null}
            </label>
            <input
              type="number"
              name={`order_${person.id}`}
              min={1}
              step={1}
              defaultValue={selections.get(person.id) ?? 1}
              className="w-16 border border-hairline bg-white px-2 py-1 font-admin text-xs text-ink"
              aria-label={`Byline order for ${person.name}`}
            />
          </div>
        ))}
      </fieldset>

      {state.error ? <p className="font-admin text-sm text-digest-red">{state.error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="w-fit bg-digest-red px-6 py-3 font-admin text-sm uppercase tracking-wide text-paper disabled:opacity-60"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
