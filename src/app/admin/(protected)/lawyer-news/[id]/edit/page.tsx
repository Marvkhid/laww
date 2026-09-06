import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLawyerNewsByIdForAdmin } from "@/lib/supabase/admin/lawyer-news";
import { LawyerNewsForm } from "../../lawyer-news-form";
import { updateLawyerNewsAction } from "../../actions";

export const metadata: Metadata = {
  title: "Edit Interview — Lawyer in the News — Admin",
};

export default async function EditLawyerNewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const entry = await getLawyerNewsByIdForAdmin(id);

  if (!entry) notFound();

  const boundAction = updateLawyerNewsAction.bind(null, entry.id);

  return (
    <div>
      <h1 className="mb-8 font-admin text-2xl font-semibold text-ink">
        Edit — {entry.lawyer_name}
      </h1>
      <LawyerNewsForm action={boundAction} initial={entry} submitLabel="Save Changes" />
    </div>
  );
}
