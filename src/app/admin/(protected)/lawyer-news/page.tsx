import type { Metadata } from "next";
import Link from "next/link";
import { listLawyerNewsForAdmin } from "@/lib/supabase/admin/lawyer-news";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";
import { deleteLawyerNewsAction } from "./actions";

export const metadata: Metadata = {
  title: "Lawyer in the News — Admin",
};

export default async function AdminLawyerNewsPage() {
  const entries = await listLawyerNewsForAdmin();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-admin text-2xl font-semibold text-ink">Lawyer in the News</h1>
          <p className="mt-1 text-xs text-[#666]">
            The published entry appears as the homepage Cover Story.
          </p>
        </div>
        <Link
          href="/admin/lawyer-news/new"
          className="bg-digest-red px-4 py-2 font-admin text-sm font-semibold uppercase tracking-wide text-paper"
        >
          New Interview
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-[#333]">
          No interviews yet. Create the first Lawyer in the News entry.
        </p>
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between border border-hairline p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{entry.lawyer_name}</p>
                <p className="text-[11px] text-[#333]">
                  /{entry.slug} · {entry.qa_pairs?.length ?? 0} Q&amp;A pairs
                  {entry.status === "published"
                    ? " · Published"
                    : entry.status === "archived"
                      ? " · Archived"
                      : " · Pending review"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <Link
                  href={`/admin/lawyer-news/${entry.id}/edit`}
                  className="text-xs font-semibold uppercase tracking-wide text-digest-red transition-opacity hover:text-digest-red-deep"
                >
                  Edit
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await deleteLawyerNewsAction(entry.id);
                  }}
                >
                  <DeleteConfirmButton
                    label="Delete"
                    confirmMessage="Delete this interview? This cannot be undone."
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
