import type { Metadata } from "next";
import { ArchiveIssueForm } from "@/app/admin/(protected)/issues/archive/archive-issue-form";
import { createArchiveIssueAction } from "@/app/admin/(protected)/issues/archive/actions";
import { AdminBackButton } from "@/app/admin/(protected)/admin-back-button";

export const metadata: Metadata = {
  title: "New Archived Issue — Admin",
};

export default function NewArchiveIssuePage() {
  return (
    <div>
      <AdminBackButton />
      <h1 className="mb-8 mt-4 font-admin text-2xl font-semibold text-ink">New Archived Issue</h1>
      <ArchiveIssueForm action={createArchiveIssueAction} submitLabel="Create Issue" />
    </div>
  );
}
