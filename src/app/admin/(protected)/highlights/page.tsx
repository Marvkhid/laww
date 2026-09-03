import type { Metadata } from "next";
import Link from "next/link";
import { listHighlightsForAdmin } from "@/lib/supabase/admin/homepage-highlights";
import { deleteHighlightAction } from "./actions";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";

export const metadata: Metadata = {
  title: "Homepage Highlights — Admin",
};

export default async function AdminHighlightsPage() {
  const highlights = await listHighlightsForAdmin();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-admin text-2xl font-semibold text-ink">Homepage Highlights</h1>
        <Link
          href="/admin/highlights/new"
          className="bg-digest-red px-4 py-2 font-admin text-sm font-semibold uppercase tracking-wide text-paper"
        >
          New Highlight
        </Link>
      </div>

      {highlights.length === 0 ? (
        <p className="font-admin text-sm text-[#333]">
          No highlights yet. Add editorial content here to display on the homepage.
        </p>
      ) : (
        <div className="space-y-4">
          {highlights.map((highlight) => (
            <div
              key={highlight.id}
              className="flex items-center justify-between border border-hairline p-4"
            >
              <div>
                <p className="font-admin text-sm font-semibold text-ink">
                  {highlight.title}
                </p>
                <p className="font-admin text-xs text-[#333]">
                  {highlight.category ?? "Uncategorized"}
                  {highlight.published ? "" : " · Draft"}
                  {highlight.display_order > 0 ? ` · Order: ${highlight.display_order}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/admin/highlights/${highlight.id}/edit`}
                  className="font-admin text-xs uppercase tracking-wide text-digest-red hover:text-digest-red-deep transition-opacity"
                >
                  Edit
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await deleteHighlightAction(highlight.id);
                  }}
                >
                  <DeleteConfirmButton
                    label="Delete"
                    confirmMessage="Delete this highlight? This cannot be undone."
                  />
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
