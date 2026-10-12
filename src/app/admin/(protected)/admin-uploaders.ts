/**
 * Per-section uploaders.
 *
 * ONE implementation (lib/upload-client.ts) + ONE server action
 * (upload-sign-actions.ts), bound to a section name here. The admin forms pass
 * one of these instead of a Server Action that took the file, so no section can
 * accidentally reintroduce the "file travels through the function" path.
 *
 * Client-only module — it is imported by the admin form components.
 */

import { uploadAdminFile, type UploadResult } from "@/lib/upload-client";
import type { UploadFolder } from "@/lib/upload-folders";
import { createSignedUploadAction } from "@/app/admin/(protected)/upload-sign-actions";

export type AdminUploader = (
  file: File,
  signal?: AbortSignal
) => Promise<UploadResult>;

function imageUploader(folder: UploadFolder): AdminUploader {
  return (file, signal) =>
    uploadAdminFile(file, {
      kind: "image",
      folder,
      sign: createSignedUploadAction,
      signal,
    });
}

function pdfUploader(folder: UploadFolder): AdminUploader {
  return (file, signal) =>
    uploadAdminFile(file, {
      kind: "pdf",
      folder,
      sign: createSignedUploadAction,
      signal,
    });
}

export const uploadArticleImage = imageUploader("articles");
export const uploadEventImage = imageUploader("events");
export const uploadIssueCoverImage = imageUploader("issues");
export const uploadIssuePdf = pdfUploader("issues");
export const uploadArchiveCoverImage = imageUploader("archive");
export const uploadArchivePdf = pdfUploader("archive");
export const uploadLawyerNewsImage = imageUploader("lawyer-news");
export const uploadLegalUpdateImage = imageUploader("legal-updates");
export const uploadLegalInsightImage = imageUploader("legal-insights");
export const uploadHighlightImage = imageUploader("highlights");
export const uploadPracticeAreaImage = imageUploader("practice-areas");
export const uploadSponsorImage = imageUploader("sponsors");
export const uploadContributorPhoto = imageUploader("contributors");
