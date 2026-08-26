import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArchiveIssueByIdForAdmin } from "@/lib/supabase/admin/issues-archive";
import { ArchiveIssueForm } from "@/app/admin/(protected)/issues/archive/archive-issue-form";
import { updateArchiveIssueAction, deleteArchiveIssueAction } from "@/app/admin/(protected)/issues/archive/actions";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";

export const metadata: Metadata = {
  title: "Edit Archived Issue — Admin",
};

export default async function EditArchiveIssuePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const issue = await getArchiveIssueByIdForAdmin(id);

  if (!issue) notFound();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-admin text-2xl font-semibold text-ink">Edit Archived Issue</h1>
        <form
          action={async () => {
            "use server";
            await deleteArchiveIssueAction(issue!.id);
          }}
        >
          <DeleteConfirmButton label="Delete" confirmMessage="Delete this archived issue? This cannot be undone." />
        </form>
      </div>
      <ArchiveIssueForm
        action={updateArchiveIssueAction.bind(null, issue!.id)}
        initial={issue}
        entityId={issue!.id}
        submitLabel="Save Changes"
      />
    </div>
  );
}
