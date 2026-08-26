"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createArchiveIssue,
  updateArchiveIssue,
  deleteArchiveIssue,
  type ArchiveIssueInput,
} from "@/lib/supabase/admin/issues-archive";
import { uploadArchiveCoverImage, uploadIssuePdf } from "@/lib/supabase/admin/storage";

export type FormState = { error: string | null };

async function readArchiveInput(formData: FormData): Promise<{ input: ArchiveIssueInput | null; error: string | null }> {
  const optional = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw.length > 0 ? raw : null;
  };

  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();

  if (!slug || !title) {
    return { input: null, error: "Slug and title are both required." };
  }

  // Cover image upload
  let cover_image_url: string | null = optional("existing_cover_image_url");
  const coverFile = formData.get("cover_image_file");
  if (coverFile instanceof File && coverFile.size > 0) {
    const { url, error } = await uploadArchiveCoverImage(coverFile);
    if (error) return { input: null, error };
    cover_image_url = url;
  }

  // PDF upload
  let pdf_url: string | null = optional("existing_pdf_url");
  const pdfFile = formData.get("pdf_file");
  if (pdfFile instanceof File && pdfFile.size > 0) {
    const { url, error } = await uploadIssuePdf(pdfFile);
    if (error) return { input: null, error };
    pdf_url = url;
  }

  const issueNumberRaw = String(formData.get("issue_number") ?? "").trim();
  const yearRaw = String(formData.get("year") ?? "").trim();

  return {
    input: {
      slug,
      title,
      description: optional("description"),
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
