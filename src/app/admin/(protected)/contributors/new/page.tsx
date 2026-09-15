import type { Metadata } from "next";
import { ContributorForm } from "@/app/admin/(protected)/contributors/contributor-form";
import { createContributorAction } from "@/app/admin/(protected)/contributors/actions";
import { AdminBackButton } from "@/app/admin/(protected)/admin-back-button";

export const metadata: Metadata = {
  title: "New Contributor — Admin",
  robots: { index: false, follow: false },
};

export default function NewContributorPage() {
  return (
    <div>
      <AdminBackButton />
      <h1 className="mt-4 font-admin text-2xl font-semibold text-ink">New Contributor</h1>
      <div className="mt-6">
        <ContributorForm action={createContributorAction} submitLabel="Create" />
      </div>
    </div>
  );
}
