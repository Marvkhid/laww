"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createCallForPapers,
  updateCallForPapers,
  deleteCallForPapers,
  getCallForPapersByIdForAdmin,
  getCallForPapersByIssueNumber,
  type CallForPapersInput,
} from "@/lib/supabase/admin/call-for-papers";
import { dataToFormData, type AutosaveResult } from "@/lib/autosave";

export type FormState = { error: string | null };

/**
 * Autosave — calls for papers have no publication state, so every valid
 * snapshot persists as-is. Never redirects, never revalidates.
 */
export async function autosaveCallForPapersAction(
  id: string | null,
  rawData: Record<string, string[]>
): Promise<AutosaveResult> {
  const formData = dataToFormData(rawData);
  const { input, error: validationError } = readInput(formData);
  if (!input) return { id, error: validationError ?? "Invalid call for papers." };
  const practiceAreaIds = readSelectedPracticeAreaIds(formData);

  if (!id) {
    const created = await createCallForPapers(input, practiceAreaIds);
    if (created.error) return { id: null, error: created.error };
    // Issue numbers are unique — resolve the row id the create produced.
    const row = await getCallForPapersByIssueNumber(input.issue_number);
    return { id: row?.id ?? null, error: null };
  }

  const { error } = await updateCallForPapers(id, input, practiceAreaIds);
  if (error) return { id, error };
  return { id, error: null };
}

function readInput(formData: FormData): { input: CallForPapersInput | null; error: string | null } {
  const issueNumberRaw = String(formData.get("issue_number") ?? "").trim();
  const issueMonth = String(formData.get("issue_month") ?? "").trim();
  const deadline = String(formData.get("deadline") ?? "").trim();
  const wordLimitRaw = String(formData.get("word_limit") ?? "").trim();
  const contactEmail = String(formData.get("contact_email") ?? "").trim();

  const issueNumber = Number(issueNumberRaw);
  const wordLimit = Number(wordLimitRaw);

  if (!issueNumberRaw || !Number.isInteger(issueNumber) || issueNumber <= 0) {
    return { input: null, error: "Issue number must be a whole number greater than 0." };
  }
  if (!issueMonth || !deadline) {
    return { input: null, error: "Issue month and deadline are both required." };
  }
  if (!wordLimitRaw || !Number.isInteger(wordLimit) || wordLimit <= 0) {
    return { input: null, error: "Word limit must be a whole number greater than 0." };
  }
  if (!contactEmail) {
    return { input: null, error: "Contact email is required." };
  }

  return {
    input: {
      issue_number: issueNumber,
      issue_month: issueMonth,
      deadline,
      word_limit: wordLimit,
      contact_email: contactEmail,
    },
    error: null,
  };
}

function readSelectedPracticeAreaIds(formData: FormData): string[] {
  return formData.getAll("practice_area_ids").map(String);
}

function revalidateCfpPaths() {
  revalidatePath("/admin/call-for-papers");
  revalidatePath("/");
}

export async function createCallForPapersAction(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = readInput(formData);
  if (!input) return { error: validationError };

  // Autosave already created the row — continue in it (no duplicates).
  const autosaveId = String(formData.get("autosave_id") ?? "").trim();
  if (autosaveId) {
    const current = await getCallForPapersByIdForAdmin(autosaveId);
    if (current) {
      const { error } = await updateCallForPapers(
        autosaveId,
        input,
        readSelectedPracticeAreaIds(formData)
      );
      if (error) return { error };
      revalidateCfpPaths();
      redirect("/admin/call-for-papers");
    }
  }

  const { error } = await createCallForPapers(input, readSelectedPracticeAreaIds(formData));
  if (error) return { error };

  revalidateCfpPaths();
  redirect("/admin/call-for-papers");
}

export async function updateCallForPapersAction(
  id: string,
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const { input, error: validationError } = readInput(formData);
  if (!input) return { error: validationError };

  const { error } = await updateCallForPapers(id, input, readSelectedPracticeAreaIds(formData));
  if (error) return { error };

  revalidateCfpPaths();
  redirect("/admin/call-for-papers");
}

export async function deleteCallForPapersAction(id: string) {
  const { error } = await deleteCallForPapers(id);
  if (error) return { error };

  revalidateCfpPaths();
  return { error: null };
}
