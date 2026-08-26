import type { Metadata } from "next";
import { SponsorForm } from "@/app/admin/(protected)/sponsors/sponsor-form";
import { createSponsorAction } from "@/app/admin/(protected)/sponsors/actions";

export const metadata: Metadata = {
  title: "New Sponsor — Admin",
  robots: { index: false, follow: false },
};

export default function NewSponsorPage() {
  return (
    <div>
      <h1 className="font-admin text-2xl font-semibold text-ink">New Sponsor</h1>
      <div className="mt-6">
        <SponsorForm action={createSponsorAction} submitLabel="Create" />
      </div>
    </div>
  );
}
