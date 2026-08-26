import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getIssueByIdForAdmin } from "@/lib/supabase/admin/issues";
import { updateIssueAction } from "@/app/admin/(protected)/issues/actions";
import { IssueForm } from "@/app/admin/(protected)/issues/issue-form";

export const metadata: Metadata = {
  title: "Edit Issue — Admin",
  robots: { index: false, follow: false },
};

export default async function EditIssuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const issue = await getIssueByIdForAdmin(id);

  if (!issue) {
    notFound();
  }

  const boundAction = updateIssueAction.bind(null, id);

  return (
    <div>
      <h1 className="font-admin text-2xl font-semibold text-ink">Edit Issue {issue.issue_number}</h1>
      <div className="mt-6">
        <IssueForm action={boundAction} initial={issue} submitLabel="Save changes" />
      </div>
    </div>
  );
}
