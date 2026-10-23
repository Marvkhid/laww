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
 * Normal case: sponsor has artwork (image or logo), so the matching is
 * unambiguous. When an admin drafts a sponsor without artwork (placeholder
 * pending), we still allow a single adoption path keyed on name alone, but
 * only for one inactive row — never a broadcast that would adopt every
 * inactive "Diamond" row, which would resume the old duplication bug.
 */
async function findMatchingDraft(input: SponsorInput) {
  // Artwork makes identity unambiguous.
  if (input.image_url || input.logo_url) {
    const all = await listSponsorsForAdmin();
    const matching = all.find(
      (s) => !s.active &&
        s.name === input.name &&
        s.image_url === input.image_url &&
        s.logo_url === input.logo_url &&
        s.website_url === input.website_url &&
        s.tier === input.tier &&
        s.display_order === input.display_order &&
        s.page_number === input.page_number &&
        (s.show_on_pages ?? null) === (input.show_on_pages ?? null)
    );
    return matching ?? null;
  }

  // No artwork yet — key adoption on name only, and cap it to a single
  // inactive row so an unchecked form can never adopt multiple similar rows.
  const nameOnly = await listSponsorsForAdmin();
  const matching = nameOnly.find(
    (s) => !s.active && s.name === input.name
  );
  return matching ?? null;
}

export async function createSponsorAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = await readInput(formData);
  if (!input) return { error: validationError };

  // Autosave already created the draft advert — continue in it so no
  // duplicate row is produced, and let this explicit Save apply `active`.
  // Only an INACTIVE advert may be continued: a create flow must never
  // rewrite a live sponsor whose id leaked in from a stale recovery snapshot
  // or a second tab (see articles/actions.ts).
  const autosaveId = String(formData.get("autosave_id") ?? "").trim();
  if (autosaveId) {
    const named = await getSponsorByIdForAdmin(autosaveId);
    const current = named && !named.active ? named : null;
    if (current) {
      const { error } = await updateSponsor(autosaveId, input);
      if (error) return { error };
      revalidateAdPaths();
      redirect("/admin/sponsors");
    }
  }

  // If the client submitted before its first autosave round-trip, the
  // autosave_id is still empty. Guard against the race now: look for an
  // inactive draft with the same identity (same name + same artwork, or —
  // artwork-less drafts — the same name) and continue it. We never touch a
  // live sponsor with the same identity, and we never adopt more than one
  // row on this flow.
  const draft = await findMatchingDraft(input);
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
