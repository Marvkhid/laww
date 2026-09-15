import type { Metadata } from "next";
import { LawyerNewsForm } from "../lawyer-news-form";
import { createLawyerNewsAction } from "../actions";
import { AdminBackButton } from "@/app/admin/(protected)/admin-back-button";

export const metadata: Metadata = {
  title: "New Interview — Lawyer in the News — Admin",
};

export default function NewLawyerNewsPage() {
  return (
    <div>
      <AdminBackButton />
      <h1 className="mb-8 mt-4 font-admin text-2xl font-semibold text-ink">
        New Lawyer in the News
      </h1>
      <LawyerNewsForm action={createLawyerNewsAction} submitLabel="Create Interview" />
    </div>
  );
}
