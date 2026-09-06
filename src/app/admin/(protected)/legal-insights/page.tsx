import type { Metadata } from "next";
import Link from "next/link";
import { listLegalInsightsForAdmin } from "@/lib/supabase/admin/legal-insights";
import { deleteLegalInsightAction } from "./actions";
import { DeleteConfirmButton } from "@/components/ui/delete-confirm-button";

export const metadata: Metadata = {
  title: "Legal Questions of the Day — Admin",
};

export default async function AdminLegalInsightsPage() {
  const insights = await listLegalInsightsForAdmin();

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-admin text-2xl font-semibold text-ink">
            Legal Questions of the Day
          </h1>
          <p className="mt-1 text-xs text-[#666]">
            Interactive quiz shown on the homepage. Mark the correct answer so readers can play.
          </p>
        </div>
        <Link
          href="/admin/legal-insights/new"
          className="bg-digest-red px-4 py-2 font-admin text-sm font-semibold uppercase tracking-wide text-paper"
        >
          New Question
        </Link>
      </div>

      {insights.length === 0 ? (
        <p className="font-admin text-sm text-[#333]">
          No questions yet. Add the first Legal Question of the Day.
        </p>
      ) : (
        <div className="space-y-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className="flex items-center justify-between border border-hairline p-4"
            >
              <div>
                <p className="font-admin text-sm font-semibold text-ink">
                  {insight.title}
                </p>
                <p className="font-admin text-[11px] text-[#333]">
                  {insight.category}
                  {insight.published ? "" : " · Draft"}
                  {insight.display_order > 0 ? ` · Order: ${insight.display_order}` : ""}
                  {` · ${(insight.answer_options ?? []).length} options`}
                  {typeof insight.correct_option === "number"
                    ? ` · Correct: ${String.fromCharCode(65 + insight.correct_option)}`
                    : " · ⚠ No correct answer"}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/admin/legal-insights/${insight.id}/edit`}
                  className="font-admin text-xs uppercase tracking-wide text-digest-red hover:text-digest-red-deep transition-opacity"
                >
                  Edit
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await deleteLegalInsightAction(insight.id);
                  }}
                >
                  <DeleteConfirmButton
                    label="Delete"
                    confirmMessage="Delete this question? This cannot be undone."
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
