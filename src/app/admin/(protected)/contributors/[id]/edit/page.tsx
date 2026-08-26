import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContributorByIdForAdmin } from "@/lib/supabase/admin/contributors";
import { updateContributorAction } from "@/app/admin/(protected)/contributors/actions";
import { ContributorForm } from "@/app/admin/(protected)/contributors/contributor-form";

export const metadata: Metadata = {
  title: "Edit Contributor — Admin",
  robots: { index: false, follow: false },
};

export default async function EditContributorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contributor = await getContributorByIdForAdmin(id);

  if (!contributor) {
    notFound();
  }

  const boundAction = updateContributorAction.bind(null, id);

  return (
    <div>
      <h1 className="font-admin text-2xl font-semibold text-ink">Edit Contributor</h1>
      <div className="mt-6">
        <ContributorForm action={boundAction} initial={contributor} submitLabel="Save changes" />
      </div>
    </div>
  );
}
