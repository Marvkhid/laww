import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLegalInsightByIdForAdmin } from "@/lib/supabase/admin/legal-insights";
import { updateLegalInsightAction } from "../../actions";
import { InsightForm } from "../../insight-form";

export const metadata: Metadata = {
  title: "Edit Legal Insight — Admin",
};

export default async function EditInsightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const insight = await getLegalInsightByIdForAdmin(id);

  if (!insight) {
    notFound();
  }

  const boundAction = updateLegalInsightAction.bind(null, id);

  return (
    <div>
      <h1 className="font-admin text-2xl font-semibold text-ink">Edit Legal Insight</h1>
      <div className="mt-6">
        <InsightForm action={boundAction} initial={insight} submitLabel="Save changes" entityId={id} />
      </div>
    </div>
  );
}
