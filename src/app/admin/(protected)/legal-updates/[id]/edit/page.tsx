import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLegalUpdateByIdForAdmin } from "@/lib/supabase/admin/legal-updates";
import { listPracticeAreasForAdmin } from "@/lib/supabase/admin/practice-areas";
import { updateLegalUpdateAction } from "@/app/admin/(protected)/legal-updates/actions";
import { LegalUpdateForm } from "@/app/admin/(protected)/legal-updates/legal-update-form";

export const metadata: Metadata = {
  title: "Edit Legal Update — Admin",
  robots: { index: false, follow: false },
};

export default async function EditLegalUpdatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [legalUpdate, practiceAreas] = await Promise.all([
    getLegalUpdateByIdForAdmin(id),
    listPracticeAreasForAdmin(),
  ]);

  if (!legalUpdate) {
    notFound();
  }

  const boundAction = updateLegalUpdateAction.bind(null, id);

  return (
    <div>
      <h1 className="font-admin text-2xl font-semibold text-ink">Edit Legal Update</h1>
      <div className="mt-6">
        <LegalUpdateForm
          action={boundAction}
          initial={legalUpdate}
          practiceAreas={practiceAreas}
          submitLabel="Save changes"
        />
      </div>
    </div>
  );
}
