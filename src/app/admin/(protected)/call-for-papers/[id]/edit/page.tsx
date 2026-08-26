import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getCallForPapersByIdForAdmin,
  getCallForPapersPracticeAreaIds,
} from "@/lib/supabase/admin/call-for-papers";
import { updateCallForPapersAction } from "@/app/admin/(protected)/call-for-papers/actions";
import { CallForPapersForm } from "@/app/admin/(protected)/call-for-papers/call-for-papers-form";
import { listPracticeAreasForAdmin } from "@/lib/supabase/admin/practice-areas";

export const metadata: Metadata = {
  title: "Edit Call for Papers — Admin",
  robots: { index: false, follow: false },
};

export default async function EditCallForPapersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [record, selectedIds, practiceAreas] = await Promise.all([
    getCallForPapersByIdForAdmin(id),
    getCallForPapersPracticeAreaIds(id),
    listPracticeAreasForAdmin(),
  ]);

  if (!record) {
    notFound();
  }

  const boundAction = updateCallForPapersAction.bind(null, id);

  return (
    <div>
      <h1 className="font-admin text-2xl font-semibold text-ink">Edit Call for Papers</h1>
      <div className="mt-6">
        <CallForPapersForm
          action={boundAction}
          initial={record}
          initialPracticeAreaIds={new Set(selectedIds)}
          practiceAreas={practiceAreas}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
