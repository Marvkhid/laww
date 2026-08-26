import type { Metadata } from "next";
import { CallForPapersForm } from "@/app/admin/(protected)/call-for-papers/call-for-papers-form";
import { createCallForPapersAction } from "@/app/admin/(protected)/call-for-papers/actions";
import { listPracticeAreasForAdmin } from "@/lib/supabase/admin/practice-areas";

export const metadata: Metadata = {
  title: "New Call for Papers — Admin",
  robots: { index: false, follow: false },
};

export default async function NewCallForPapersPage() {
  const practiceAreas = await listPracticeAreasForAdmin();

  return (
    <div>
      <h1 className="font-admin text-2xl font-semibold text-ink">New Call for Papers</h1>
      <div className="mt-6">
        <CallForPapersForm
          action={createCallForPapersAction}
          practiceAreas={practiceAreas}
          submitLabel="Create"
        />
      </div>
    </div>
  );
}
