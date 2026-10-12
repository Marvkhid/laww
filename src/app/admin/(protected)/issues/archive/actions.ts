"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createArchiveIssue,
  updateArchiveIssue,
  deleteArchiveIssue,
  type ArchiveIssueInput,
} from "@/lib/supabase/admin/issues-archive";
import { slugify } from "@/lib/slugify";
import { readTextOptional } from "@/lib/form-presence";

export type FormState = { error: string | null };

async function readArchiveInput(formData: FormData): Promise<{ input: ArchiveIssueInput | null; error: string | null }> {
  const optional = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw.length > 0 ? raw : null;
  };

  const slugRaw = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  if (!title) {
    return { input: null, error: "Title is required." };
  }
  const slug = slugRaw.length > 0 ? slugRaw : slugify(title);

  // Cover image and PDF URLs are both resolved in the browser on selection and
  // arrive as hidden fields. No server action reads file bytes — a large File
  // in an action body is the request the host rejects with 413
  // (see src/lib/request-limits.ts).
  const cover_image_url: string | null = optional("existing_cover_image_url");
  const pdf_url: string | null = optional("existing_pdf_url");

  const issueNumberRaw = String(formData.get("issue_number") ?? "").trim();
  const yearRaw = String(formData.get("year") ?? "").trim();

  return {
    input: {
      slug,
      title,
      // Absent → omitted from the UPDATE, so it can never be blanked.
      description: readTextOptional(formData, "description"),
      cover_image_url,
      issue_number: issueNumberRaw ? Number(issueNumberRaw) : null,
      season: optional("season"),
      year: yearRaw ? Number(yearRaw) : null,
      pdf_url,
    },
    error: null,
  };
}

export async function createArchiveIssueAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = await readArchiveInput(formData);
  if (!input) return { error: validationError };

  const { error } = await createArchiveIssue(input);
  if (error) return { error };

  revalidatePath("/admin/issues/archive");
  revalidatePath("/issues");
  revalidatePath("/");
  redirect("/admin/issues/archive");
}

export async function updateArchiveIssueAction(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = await readArchiveInput(formData);
  if (!input) return { error: validationError };

  const { error } = await updateArchiveIssue(id, input);
  if (error) return { error };

  revalidatePath("/admin/issues/archive");
  revalidatePath("/issues");
  revalidatePath(`/issues/${input.slug}`);
  revalidatePath("/");
  redirect("/admin/issues/archive");
}

export async function deleteArchiveIssueAction(id: string) {
  const { error } = await deleteArchiveIssue(id);
  if (error) return { error };

  revalidatePath("/admin/issues/archive");
  revalidatePath("/issues");
  revalidatePath("/");
  return { error: null };
}
