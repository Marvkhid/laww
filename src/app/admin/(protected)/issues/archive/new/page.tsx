import type { Metadata } from "next";
import { ArchiveIssueForm } from "@/app/admin/(protected)/issues/archive/archive-issue-form";
import { createArchiveIssueAction } from "@/app/admin/(protected)/issues/archive/actions";

export const metadata: Metadata = {
  title: "New Archived Issue — Admin",
};

export default function NewArchiveIssuePage() {
  return (
    <div>
      <h1 className="mb-8 font-admin text-2xl font-semibold text-ink">New Archived Issue</h1>
      <ArchiveIssueForm action={createArchiveIssueAction} submitLabel="Create Issue" />
    </div>
  );
}
