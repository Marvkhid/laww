import type { Metadata } from "next";
import { ContributorForm } from "@/app/admin/(protected)/contributors/contributor-form";
import { createContributorAction } from "@/app/admin/(protected)/contributors/actions";

export const metadata: Metadata = {
  title: "New Contributor — Admin",
  robots: { index: false, follow: false },
};

export default function NewContributorPage() {
  return (
    <div>
      <h1 className="font-admin text-2xl font-semibold text-ink">New Contributor</h1>
      <div className="mt-6">
        <ContributorForm action={createContributorAction} submitLabel="Create" />
      </div>
    </div>
  );
}
