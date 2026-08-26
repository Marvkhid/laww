import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPracticeAreaByIdForAdmin } from "@/lib/supabase/admin/practice-areas";
import { updatePracticeAreaAction } from "@/app/admin/(protected)/practice-areas/actions";
import { PracticeAreaForm } from "@/app/admin/(protected)/practice-areas/practice-area-form";

export const metadata: Metadata = {
  title: "Edit Practice Area — Admin",
  robots: { index: false, follow: false },
};

export default async function EditPracticeAreaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const practiceArea = await getPracticeAreaByIdForAdmin(id);

  if (!practiceArea) {
    notFound();
  }

  const boundAction = updatePracticeAreaAction.bind(null, id);

  return (
    <div>
      <h1 className="font-admin text-2xl font-semibold text-ink">Edit Practice Area</h1>
      <div className="mt-6">
        <PracticeAreaForm action={boundAction} initial={practiceArea} submitLabel="Save changes" />
      </div>
    </div>
  );
}
