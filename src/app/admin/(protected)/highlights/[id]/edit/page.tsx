import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getHighlightByIdForAdmin } from "@/lib/supabase/admin/homepage-highlights";
import { updateHighlightAction } from "../../actions";
import { HighlightForm } from "../../highlight-form";

export const metadata: Metadata = {
  title: "Edit Highlight — Admin",
};

export default async function EditHighlightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const highlight = await getHighlightByIdForAdmin(id);

  if (!highlight) {
    notFound();
  }

  const boundAction = updateHighlightAction.bind(null, id);

  return (
    <div>
      <h1 className="font-admin text-2xl font-semibold text-ink">Edit Homepage Highlight</h1>
      <div className="mt-6">
        <HighlightForm action={boundAction} initial={highlight} submitLabel="Save changes" entityId={id} />
      </div>
    </div>
  );
}
