import type { Metadata } from "next";
import Link from "next/link";
import { listIssuesForAdmin, countArticlesForIssue } from "@/lib/supabase/admin/issues";
import { DeleteIssueButton } from "@/app/admin/(protected)/issues/delete-button";

export const metadata: Metadata = {
  title: "Issues — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminIssuesPage() {
  const issues = await listIssuesForAdmin();
  const highestIssueNumber = issues[0]?.issue_number; // listIssuesForAdmin orders desc
  const articleCounts = await Promise.all(issues.map((issue) => countArticlesForIssue(issue.id)));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-admin text-2xl font-semibold text-ink">Issues</h1>
        <Link
          href="/admin/issues/new"
          className="bg-digest-red px-4 py-2 font-admin text-sm uppercase tracking-wide text-paper"
        >
          New
        </Link>
      </div>

      {issues.length === 0 ? (
        <p className="mt-6 font-admin text-sm text-[#333]">No issues yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
          {issues.map((issue, index) => (
            <li key={issue.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-admin text-sm text-ink">
                  Issue {issue.issue_number}
                  {issue.issue_number === highestIssueNumber ? " · Current" : ""}
                </p>
                <p className="font-admin text-[10px] font-medium uppercase tracking-wide text-ink">
                  {issue.season} {issue.year} · {issue.edition}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/admin/issues/${issue.id}/edit`}
                  className="font-admin text-xs font-medium uppercase tracking-wide text-digest-red hover:text-digest-red-deep"
                >
                  Edit
                </Link>
                <DeleteIssueButton
                  id={issue.id}
                  issueNumber={issue.issue_number}
                  articleCount={articleCounts[index]}
                  isCurrentIssue={issue.issue_number === highestIssueNumber}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
