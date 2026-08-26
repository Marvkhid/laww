import type { Metadata } from "next";
import Link from "next/link";
import { listArchiveIssuesForAdmin } from "@/lib/supabase/admin/issues-archive";
import { deleteArchiveIssueAction } from "./actions";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";

export const metadata: Metadata = {
  title: "Issues Archive — Admin",
};

export default async function AdminArchivePage() {
  const issues = await listArchiveIssuesForAdmin();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-admin text-2xl font-semibold text-ink">Issues Archive</h1>
        <Link
          href="/admin/issues/archive/new"
          className="bg-digest-red px-4 py-2 font-admin text-sm uppercase tracking-wide text-paper"
        >
          New Archived Issue
        </Link>
      </div>

      {issues.length === 0 ? (
        <p className="font-admin text-sm text-[#333]">
          No archived issues yet. Add past issues here to build the archive.
        </p>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className="flex items-center justify-between border border-hairline p-4"
            >
              <div>
                <p className="font-admin text-sm font-medium text-ink">
                  {issue.title}
                </p>
                <p className="font-admin text-xs text-[#333]">
                  /{issue.slug}
                  {issue.issue_number ? ` · Issue ${issue.issue_number}` : ""}
                  {issue.season && issue.year ? ` · ${issue.season} ${issue.year}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/admin/issues/archive/${issue.id}/edit`}
                  className="font-admin text-xs uppercase tracking-wide text-digest-red hover:text-digest-red-deep transition-opacity"
                >
                  Edit
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await deleteArchiveIssueAction(issue.id);
                  }}
                >
                  <DeleteConfirmButton
                    label="Delete"
                    confirmMessage="Delete this archived issue? This cannot be undone."
                  />
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
