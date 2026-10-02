import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSponsorByIdForAdmin } from "@/lib/supabase/admin/sponsors";
import { updateSponsorAction } from "@/app/admin/(protected)/sponsors/actions";
import { SponsorForm } from "@/app/admin/(protected)/sponsors/sponsor-form";
import { pageTargetingAvailable } from "@/lib/supabase/admin/page-targeting";
import { AdminBackButton } from "@/app/admin/(protected)/admin-back-button";

export const metadata: Metadata = {
  title: "Edit Advert — Admin",
  robots: { index: false, follow: false },
};

export default async function EditSponsorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [sponsor, pageTargeting] = await Promise.all([
    getSponsorByIdForAdmin(id),
    pageTargetingAvailable(),
  ]);

  if (!sponsor) {
    notFound();
  }

  const boundAction = updateSponsorAction.bind(null, id);

  return (
    <div>
      <AdminBackButton />
      <h1 className="mt-4 font-admin text-2xl font-semibold text-ink">Edit Advert</h1>
      <div className="mt-6">
        <SponsorForm
          action={boundAction}
          initial={sponsor}
          submitLabel="Save changes"
          pageTargeting={pageTargeting}
        />
      </div>
    </div>
  );
}
