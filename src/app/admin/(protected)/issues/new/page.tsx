import type { Metadata } from "next";
import { IssueForm } from "@/app/admin/(protected)/issues/issue-form";
import { createIssueAction } from "@/app/admin/(protected)/issues/actions";

export const metadata: Metadata = {
  title: "New Issue — Admin",
  robots: { index: false, follow: false },
};

export default function NewIssuePage() {
  return (
    <div>
      <h1 className="font-admin text-2xl font-semibold text-ink">New Issue</h1>
      <p className="mt-2 max-w-lg font-admin text-sm text-[#333]">
        Heads up: the public site always shows whichever issue has the highest issue number
        as the current one. Creating an issue numbered higher than the existing one will make
        it the live issue immediately — there&rsquo;s no separate publish step.
      </p>
      <div className="mt-6">
        <IssueForm action={createIssueAction} submitLabel="Create" />
      </div>
    </div>
  );
}
