"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createSponsor,
  updateSponsor,
  deleteSponsor,
  setSponsorActive,
  getSponsorByIdForAdmin,
  type SponsorInput,
  listSponsorsForAdmin,
} from "@/lib/supabase/admin/sponsors";
import {
  ADVERT_PAGE_OPTIONS,
  pagesFromFormData,
} from "@/lib/page-visibility";
import { dataToFormData, type AutosaveResult } from "@/lib/autosave";

export type FormState = { error: string | null };

// Adverts can sit on any public page, so every save must invalidate all of
// them — otherwise a changed advert keeps rendering from the old route cache
// on the pages it targets.
const AD_PAGES = [
  "/",
  "/about",
  "/articles",
  "/issues",
  "/events",
  "/legal-updates",
  "/contributors",
  "/contact",
] as const;

function revalidateAdPaths() {
  revalidatePath("/admin/sponsors");
  for (const page of AD_PAGES) revalidatePath(page);
}

async function readInput(formData: FormData): Promise<{ input: SponsorInput | null; error: string | null }> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { input: null, error: "Name is required." };
  }
  const optional = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw.length > 0 ? raw : null;
  };
  const displayOrderRaw = String(formData.get("display_order") ?? "0").trim();
  const pageNumberRaw = String(formData.get("page_number") ?? "").trim();

  if (!name) {
    return { input: null, error: "Name is required." };
  }
  if (displayOrderRaw && !Number.isInteger(Number(displayOrderRaw))) {
    return { input: null, error: "Display order must be a whole number." };
  }
  if (pageNumberRaw && !Number.isInteger(Number(pageNumberRaw))) {
    return { input: null, error: "Page number must be a whole number." };
  }

  // Logo and banner URLs come from the hidden existing_* fields, which the
  // upload zones fill on selection. No server action reads file bytes: a File
  // in an action body is the request the host rejects with 413
  // (see src/lib/request-limits.ts).
  const logo_url: string | null = optional("existing_logo_url");
  const image_url: string | null = optional("existing_image_url");

  // "Display On" — null when the group was not rendered (migration 0025
  // pending), so the column keeps its current value.
  const show_on_pages = pagesFromFormData(formData, ADVERT_PAGE_OPTIONS);
  if (show_on_pages && show_on_pages.length === 0) {
    return { input: null, error: "Select at least one page under Display On." };
  }

  return {
    input: {
      name,
      logo_url,
      image_url,
      website_url: optional("website_url"),
      tier: optional("tier"),
      display_order: displayOrderRaw ? Number(displayOrderRaw) : 0,
      page_number: pageNumberRaw ? Number(pageNumberRaw) : null,
      active: formData.get("active") === "on",
      ...(show_on_pages ? { show_on_pages } : {}),
    },
    error: null,
  };
}


/**
 * Autosave — adverts have no draft/publish duality beyond `active`, and a
 * brand-new advert must never go live from autosave alone: creates force
 * active=false (the admin's explicit Save applies the checkbox), while
 * updates persist every targeting/status choice so toggling an existing
 * advert off takes effect without a separate step.
 */
export async function autosaveSponsorAction(
  id: string | null,
  rawData: Record<string, string[]>
): Promise<AutosaveResult> {
  const formData = dataToFormData(rawData);
  const { input, error: validationError } = await readInput(formData);
  if (!input) return { id, error: validationError ?? "Invalid advert." };

  if (!id) {
    const created = await createSponsor({ ...input, active: false });
    if (created.id) return { id: created.id, error: null };
    return { id: null, error: created.error };
  }

  const current = await getSponsorByIdForAdmin(id);
  if (!current) {
    // Stale id (row deleted elsewhere, or named by an old recovery snapshot).
    // Recover instead of wedging: the editor still holds the user's work, so
    // start a fresh draft and hand its id back. See articles/actions.ts.
    const recreated = await createSponsor({ ...input, active: false });
    if (recreated.error) return { id, error: recreated.error };
    return { id: recreated.id, error: null };
  }
  const { error } = await updateSponsor(id, input);
  if (error) return { id, error };
  return { id, error: null };
}

/**
 * Match an existing sponsor for an identity-based create (same name + same
 * artwork) so the explicit Save continues that row instead of inserting a
 * duplicate when two tabs race on the same sponsor.
 *
 * Adoption is identity-based, never position-based: we never take over an
 * existing sponsor because a new submission happens to match today's
 * homepage restriction or ordering. That is what made a new post silently
 * replace an existing one.
 *
 * For adverts, the identity key is the full placement tuple (name + artwork +
 * website + tier + ordering + page targeting). Artwork makes it unambiguous;
 * without artwork we still key on name plus the same targeting fields, but
 * name alone is the minimum because a placeholder advert has nothing else to
 * go on yet. Unlike articles (where the key is a unique slug), sponsor names
 * are NOT unique in this schema, so we match on the full tuple and only ever
 * adopt the single row whose tuple matches — never a broadcast across every
 * row that shares a name.
 *
 * We adopt regardless of `active` state: a draft-only gate (mirror of the
 * article fix) is wrong for sponsors because the same admin, saving twice,
 * would create the draft, tick Active, then have the explicit Save skip the
 * now-active draft and insert a second row — the duplicate that this file's
 * admin list and the homepage both render twice. Continuing the live row is
 * the correct behaviour for an identity match.
 */
async function findSponsorForAdoption(input: SponsorInput) {
  const all = await listSponsorsForAdmin();
  return all.find(
    (s) =>
      s.name === input.name &&
      s.image_url === input.image_url &&
      s.logo_url === input.logo_url &&
      s.website_url === input.website_url &&
      s.tier === input.tier &&
      s.display_order === input.display_order &&
      s.page_number === input.page_number &&
      (s.show_on_pages ?? null) === (input.show_on_pages ?? null)
  ) ?? null;
}

export async function createSponsorAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = await readInput(formData);
  if (!input) return { error: validationError };

  // Autosave already created (or recovered to) the advert row — continue
  // in it so no duplicate row is produced, and let this explicit Save apply
  // `active` and any page-targeting change. Adoption is identity-based, never
  // position-based: we continue the row whose id the editor holds, and we
  // never take over a different sponsor just because a new submission happens
  // to match today's homepage restriction or ordering (that is what made a new
  // post silently replace an existing one).
  //
  // We update regardless of `active` state. A draft-only gate (mirror of the
  // article fix) is wrong for sponsors: the admin types, autosave creates a
  // draft (inactive), ticks Active, autosave sets the draft active, then the
  // explicit Save skips the now-active draft and inserts a second row — the
  // duplicate rendered twice in the admin list and twice on the public site.
  // The autosave_id is session-scoped (useAutosave + editorSessionToken, plus
  // the per-tab recovery-snapshot token check on mount), so a stale id from
  // another tab or an un-tokened legacy snapshot cannot reach this branch.
  const autosaveId = String(formData.get("autosave_id") ?? "").trim();
  if (autosaveId) {
    const named = await getSponsorByIdForAdmin(autosaveId);
    if (named) {
      const { error } = await updateSponsor(autosaveId, input);
      if (error) return { error };
      revalidateAdPaths();
      redirect("/admin/sponsors");
    }
  }

  // If the client submitted before its first autosave round-trip, the
  // autosave_id is still empty. Guard against the race now: look for a
  // sponsor whose identity tuple (name + artwork + website + tier +
  // ordering + page targeting) matches, and continue that row. Adoption is
  // identity-based, never position-based, and we never adopt more than one
  // row on this flow.
  const draft = await findSponsorForAdoption(input);
  if (draft) {
    const { error } = await updateSponsor(draft.id, input);
    if (!error) {
      revalidateAdPaths();
      redirect("/admin/sponsors");
    }
    return { error: error ?? "Could not complete the advert. Please try again." };
  }

  const { error } = await createSponsor(input);
  if (error) return { error };

  revalidateAdPaths();
  redirect("/admin/sponsors");
}

export async function updateSponsorAction(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = await readInput(formData);
  if (!input) return { error: validationError };

  const { error } = await updateSponsor(id, input);
  if (error) return { error };

  revalidateAdPaths();
  redirect("/admin/sponsors");
}

export async function deleteSponsorAction(id: string) {
  const { error } = await deleteSponsor(id);
  if (error) return { error };

  revalidateAdPaths();
  return { error: null };
}

export async function toggleSponsorActiveAction(id: string, active: boolean) {
  const { error } = await setSponsorActive(id, active);
  if (error) return { error };

  revalidateAdPaths();
  return { error: null };
}
