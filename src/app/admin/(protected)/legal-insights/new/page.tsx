import type { Metadata } from "next";
import { InsightForm } from "../insight-form";
import { createLegalInsightAction } from "../actions";
import { AdminBackButton } from "@/app/admin/(protected)/admin-back-button";

export const metadata: Metadata = {
  title: "New Legal Question — Admin",
};

export default function NewInsightPage() {
  return (
    <div>
      <AdminBackButton />
      <h1 className="mt-4 font-admin text-2xl font-semibold text-ink">
        New Legal Question of the Day
      </h1>
      <div className="mt-6">
        <InsightForm action={createLegalInsightAction} submitLabel="Create Question" />
      </div>
    </div>
  );
}
