"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createIssue,
  updateIssue,
  deleteIssue,
  type IssueInput,
} from "@/lib/supabase/admin/issues";
import { uploadIssuePdf, uploadIssueCoverImage } from "@/lib/supabase/admin/storage";

export type FormState = { error: string | null };

async function readInput(formData: FormData): Promise<{ input: IssueInput | null; error: string | null }> {
  const optional = (key: string) => {
    const raw = String(formData.get(key) ?? "").trim();
    return raw.length > 0 ? raw : null;
  };

  const issueNumberRaw = String(formData.get("issue_number") ?? "").trim();
  const yearRaw = String(formData.get("year") ?? "").trim();
  const issueNumber = Number(issueNumberRaw);
  const year = Number(yearRaw);
  const season = String(formData.get("season") ?? "").trim();
  const edition = String(formData.get("edition") ?? "").trim();

  if (!issueNumberRaw || !Number.isInteger(issueNumber) || issueNumber <= 0) {
    return { input: null, error: "Issue number must be a whole number greater than 0." };
  }
  if (!yearRaw || !Number.isInteger(year) || year < 2000 || year > 2100) {
    return { input: null, error: "Year must be a valid whole number (e.g. 2026)." };
  }
  if (!season || !edition) {
    return { input: null, error: "Season and edition are both required." };
  }

  const publishedAtRaw = String(formData.get("published_at") ?? "").trim();

  // Cover image upload — independent of PDF
  let cover_image_url: string | null = optional("existing_cover_image_url");
  const imageFile = formData.get("cover_image_file");
  if (imageFile instanceof File && imageFile.size > 0) {
    const { url, error: imageError } = await uploadIssueCoverImage(imageFile);
    if (imageError) return { input: null, error: imageError };
    cover_image_url = url;
  }

  // PDF upload — independent of cover image
  let pdf_url: string | null = optional("existing_pdf_url");
  const pdfFile = formData.get("pdf_file");
  if (pdfFile instanceof File && pdfFile.size > 0) {
    const { url, error: pdfError } = await uploadIssuePdf(pdfFile);
    if (pdfError) return { input: null, error: pdfError };
    pdf_url = url;
  }

  return {
    input: {
      issue_number: issueNumber,
      season,
      year,
      edition,
      cover_image_url,
      pdf_url,
      price_ngn: optional("price_ngn"),
      price_uk: optional("price_uk"),
      price_us: optional("price_us"),
      published_at: publishedAtRaw ? new Date(publishedAtRaw).toISOString() : null,
    },
    error: null,
  };
}

function revalidateIssuePaths() {
  revalidatePath("/admin/issues");
  revalidatePath("/issues");
  revalidatePath("/");
  revalidatePath("/articles/[slug]", "page");
  revalidatePath("/issues/[slug]", "page");
}

export async function createIssueAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = await readInput(formData);
  if (!input) return { error: validationError };

  const { error } = await createIssue(input);
  if (error) return { error };

  revalidateIssuePaths();
  redirect("/admin/issues");
}

export async function updateIssueAction(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = await readInput(formData);
  if (!input) return { error: validationError };

  const { error } = await updateIssue(id, input);
  if (error) return { error };

  revalidateIssuePaths();
  redirect("/admin/issues");
}

export async function deleteIssueAction(id: string) {
  const { error } = await deleteIssue(id);
  if (error) return { error };

  revalidateIssuePaths();
  return { error: null };
}
