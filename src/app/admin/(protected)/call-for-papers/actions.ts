"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createCallForPapers,
  updateCallForPapers,
  deleteCallForPapers,
  type CallForPapersInput,
} from "@/lib/supabase/admin/call-for-papers";

export type FormState = { error: string | null };

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
