import type { Metadata } from "next";
import { LegalUpdateForm } from "@/app/admin/(protected)/legal-updates/legal-update-form";
import { createLegalUpdateAction } from "@/app/admin/(protected)/legal-updates/actions";
import { listPracticeAreasForAdmin } from "@/lib/supabase/admin/practice-areas";
import { AdminBackButton } from "@/app/admin/(protected)/admin-back-button";

export const metadata: Metadata = {
  title: "New Legal Update — Admin",
  robots: { index: false, follow: false },
};

export default async function NewLegalUpdatePage() {
  const practiceAreas = await listPracticeAreasForAdmin();

  return (
    <div>
      <AdminBackButton />
      <h1 className="mt-4 font-admin text-2xl font-semibold text-ink">New Legal Update</h1>
      <div className="mt-6">
        <LegalUpdateForm
          action={createLegalUpdateAction}
          practiceAreas={practiceAreas}
          submitLabel="Create"
        />
      </div>
    </div>
  );
}
