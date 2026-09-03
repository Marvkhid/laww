import type { Metadata } from "next";
import Link from "next/link";
import { listCallForPapersForAdmin } from "@/lib/supabase/admin/call-for-papers";
import { DeleteCallForPapersButton } from "@/app/admin/(protected)/call-for-papers/delete-button";

export const metadata: Metadata = {
  title: "Call for Papers — Admin",
  robots: { index: false, follow: false },
};

export default async function AdminCallForPapersPage() {
  const records = await listCallForPapersForAdmin();

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-admin text-2xl font-semibold text-ink">Call for Papers</h1>
        <Link
          href="/admin/call-for-papers/new"
          className="bg-digest-red px-4 py-2 font-admin text-sm font-semibold uppercase tracking-wide text-paper"
        >
          New
        </Link>
      </div>

      {records.length === 0 ? (
        <p className="mt-6 font-admin text-sm text-[#333]">No call for papers records yet.</p>
      ) : (
        <ul className="mt-6 divide-y divide-hairline border-y border-hairline">
          {records.map((record) => (
            <li key={record.id} className="flex items-center justify-between py-3">
              <div>
                <p className="font-admin text-sm text-ink">Issue {record.issue_number}</p>
                <p className="font-admin text-[11px] font-semibold uppercase tracking-wide text-ink">
                  {record.issue_month} · Deadline {record.deadline} · {record.word_limit} words
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/admin/call-for-papers/${record.id}/edit`}
                  className="font-admin text-xs font-semibold uppercase tracking-wide text-digest-red hover:text-digest-red-deep"
                >
                  Edit
                </Link>
                <DeleteCallForPapersButton id={record.id} issueNumber={record.issue_number} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
