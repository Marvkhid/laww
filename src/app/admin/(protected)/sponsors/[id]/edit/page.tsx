import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSponsorByIdForAdmin } from "@/lib/supabase/admin/sponsors";
import { updateSponsorAction } from "@/app/admin/(protected)/sponsors/actions";
import { SponsorForm } from "@/app/admin/(protected)/sponsors/sponsor-form";

export const metadata: Metadata = {
  title: "Edit Sponsor — Admin",
  robots: { index: false, follow: false },
};

export default async function EditSponsorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sponsor = await getSponsorByIdForAdmin(id);

  if (!sponsor) {
    notFound();
  }

  const boundAction = updateSponsorAction.bind(null, id);

  return (
    <div>
      <h1 className="font-admin text-2xl font-semibold text-ink">Edit Sponsor</h1>
      <div className="mt-6">
        <SponsorForm action={boundAction} initial={sponsor} submitLabel="Save changes" />
      </div>
    </div>
  );
}
