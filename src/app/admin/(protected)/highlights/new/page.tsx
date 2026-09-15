import type { Metadata } from "next";
import { HighlightForm } from "../highlight-form";
import { createHighlightAction } from "../actions";
import { AdminBackButton } from "@/app/admin/(protected)/admin-back-button";

export const metadata: Metadata = {
  title: "New Highlight — Admin",
};

export default function NewHighlightPage() {
  return (
    <div>
      <AdminBackButton />
      <h1 className="mt-4 font-admin text-2xl font-semibold text-ink">New Homepage Highlight</h1>
      <div className="mt-6">
        <HighlightForm action={createHighlightAction} submitLabel="Create Highlight" />
      </div>
    </div>
  );
}
