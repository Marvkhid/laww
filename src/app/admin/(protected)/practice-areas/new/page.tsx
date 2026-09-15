import type { Metadata } from "next";
import { PracticeAreaForm } from "@/app/admin/(protected)/practice-areas/practice-area-form";
import { createPracticeAreaAction } from "@/app/admin/(protected)/practice-areas/actions";
import { AdminBackButton } from "@/app/admin/(protected)/admin-back-button";

export const metadata: Metadata = {
  title: "New Practice Area — Admin",
  robots: { index: false, follow: false },
};

export default function NewPracticeAreaPage() {
  return (
    <div>
      <AdminBackButton />
      <h1 className="mt-4 font-admin text-2xl font-semibold text-ink">New Practice Area</h1>
      <div className="mt-6">
        <PracticeAreaForm action={createPracticeAreaAction} submitLabel="Create" />
      </div>
    </div>
  );
}
