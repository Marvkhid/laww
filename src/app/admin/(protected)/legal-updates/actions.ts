"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createLegalUpdate,
  updateLegalUpdate,
  deleteLegalUpdate,
  setLegalUpdateStatus,
  type LegalUpdateInput,
} from "@/lib/supabase/admin/legal-updates";
import type { LegalUpdateStatus } from "@/lib/supabase/types";

export type FormState = { error: string | null };

const VALID_STATUSES: LegalUpdateStatus[] = ["pending_review", "published", "rejected"];

function readInput(formData: FormData): LegalUpdateInput {
  const summaryRaw = String(formData.get("summary") ?? "").trim();
  const practiceAreaRaw = String(formData.get("practice_area_id") ?? "").trim();
  const statusRaw = String(formData.get("status") ?? "").trim();

  return {
    headline: String(formData.get("headline") ?? "").trim(),
    summary: summaryRaw.length > 0 ? summaryRaw : null,
    source_name: String(formData.get("source_name") ?? "").trim(),
    source_url: String(formData.get("source_url") ?? "").trim(),
    practice_area_id: practiceAreaRaw.length > 0 ? practiceAreaRaw : null,
    status: (VALID_STATUSES as string[]).includes(statusRaw)
      ? (statusRaw as LegalUpdateStatus)
      : "pending_review",
  };
}

function validate(input: LegalUpdateInput): string | null {
  if (!input.headline) return "Headline is required.";
  if (!input.source_name) return "Source name is required.";
  if (!input.source_url) return "Source URL is required.";
  try {
    new URL(input.source_url);
  } catch {
    return "Source URL must be a valid URL, including https://.";
  }
  return null;
}

export async function createLegalUpdateAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const input = readInput(formData);
  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const { error } = await createLegalUpdate(input);
  if (error) return { error };

  revalidatePath("/admin/legal-updates");
  redirect("/admin/legal-updates");
}

export async function updateLegalUpdateAction(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const input = readInput(formData);
  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const { error } = await updateLegalUpdate(id, input);
  if (error) return { error };

  revalidatePath("/admin/legal-updates");
  redirect("/admin/legal-updates");
}

export async function deleteLegalUpdateAction(id: string) {
  const { error } = await deleteLegalUpdate(id);
  if (error) return { error };

  revalidatePath("/admin/legal-updates");
  return { error: null };
}

export async function setLegalUpdateStatusAction(id: string, status: LegalUpdateStatus) {
  const { error } = await setLegalUpdateStatus(id, status);
  if (error) return { error };

  revalidatePath("/admin/legal-updates");
  return { error: null };
}
