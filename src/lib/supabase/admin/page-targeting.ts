import { requireAdmin } from "@/lib/supabase/admin/require-admin";

/**
 * Is the page-targeting column (migration 0025) present in the database?
 *
 * Migrations in this project are applied out of band, so the admin UI must
 * never show "Display On" checkboxes that would then be silently dropped on
 * save. The new/edit pages probe once and either render the control group or
 * an explicit "run migration 0025" notice instead.
 */
export async function pageTargetingAvailable(): Promise<boolean> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase
      .from("articles")
      .select("show_on_pages")
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}
