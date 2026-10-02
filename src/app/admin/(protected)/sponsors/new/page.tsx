import type { Metadata } from "next";
import { SponsorForm } from "@/app/admin/(protected)/sponsors/sponsor-form";
import { createSponsorAction } from "@/app/admin/(protected)/sponsors/actions";
import { pageTargetingAvailable } from "@/lib/supabase/admin/page-targeting";
import { AdminBackButton } from "@/app/admin/(protected)/admin-back-button";

export const metadata: Metadata = {
  title: "New Advert — Admin",
  robots: { index: false, follow: false },
};

export default async function NewSponsorPage() {
  const pageTargeting = await pageTargetingAvailable();

  return (
    <div>
      <AdminBackButton />
      <h1 className="mt-4 font-admin text-2xl font-semibold text-ink">New Advert</h1>
      <div className="mt-6">
        <SponsorForm
          action={createSponsorAction}
          submitLabel="Create"
          pageTargeting={pageTargeting}
        />
      </div>
    </div>
  );
}
