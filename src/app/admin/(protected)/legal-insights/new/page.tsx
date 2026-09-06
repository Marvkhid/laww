import type { Metadata } from "next";
import { InsightForm } from "../insight-form";
import { createLegalInsightAction } from "../actions";

export const metadata: Metadata = {
  title: "New Legal Question — Admin",
};

export default function NewInsightPage() {
  return (
    <div>
      <h1 className="font-admin text-2xl font-semibold text-ink">
        New Legal Question of the Day
      </h1>
      <div className="mt-6">
        <InsightForm action={createLegalInsightAction} submitLabel="Create Question" />
      </div>
    </div>
  );
}
