import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/supabase/admin/require-admin";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const BUCKET = "article-images";
const PDF_MAX_BYTES = 20 * 1024 * 1024; // 20MB

/** Generic image upload helper — reusable by any admin entity. */
async function uploadImageToBucket(
  file: File,
  folder: string,
): Promise<{ url: string | null; error: string | null }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { url: null, error: "Image must be a JPEG, PNG, WEBP, or GIF." };
  }
  if (file.size > MAX_BYTES) {
    return { url: null, error: "Image must be 5MB or smaller." };
  }

  const supabase = await requireAdmin();
  const path = `${folder}/${randomUUID()}.${extensionFor(file.type)}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error(`Supabase Storage upload failed (bucket=${BUCKET}):`, uploadError);
      return { url: null, error: "Could not upload the image. Please try again." };
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    console.error(`Supabase Storage upload threw (bucket=${BUCKET}):`, err);
    return { url: null, error: "Could not upload the image. Please try again." };
  }
}

/** Upload a legal-update image (cover or inline). */
export async function uploadLegalUpdateImage(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  return uploadImageToBucket(file, "legal-updates");
}

/** Upload a lawyer-in-the-news image (cover or inline). */
export async function uploadLawyerNewsImage(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  return uploadImageToBucket(file, "lawyer-news");
}

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    default:
      return "bin";
  }
}

// Uploads via the authenticated admin client (requireAdmin()), not a
// service-role key — consistent with the rest of this project, where no
// service-role credentials are used anywhere. Authorization comes from the
// storage.objects RLS policies in migration 0008, the same "authenticated
// == admin" pattern used for every other table in this schema.
export async function uploadArticleCoverImage(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { url: null, error: "Cover image must be a JPEG, PNG, WEBP, or GIF." };
  }
  if (file.size > MAX_BYTES) {
    return { url: null, error: "Cover image must be 5MB or smaller." };
  }

  const supabase = await requireAdmin();
  const path = `${randomUUID()}.${extensionFor(file.type)}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error(`Supabase Storage upload failed (bucket=${BUCKET}):`, uploadError);
      return { url: null, error: "Could not upload the image. Please try again." };
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    console.error(`Supabase Storage upload threw (bucket=${BUCKET}):`, err);
    return { url: null, error: "Could not upload the image. Please try again." };
  }
}

export async function uploadContributorPhoto(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { url: null, error: "Photo must be a JPEG, PNG, WEBP, or GIF." };
  }
  if (file.size > MAX_BYTES) {
    return { url: null, error: "Photo must be 5MB or smaller." };
  }

  const supabase = await requireAdmin();
  const path = `contributors/${randomUUID()}.${extensionFor(file.type)}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error(`Supabase Storage upload failed (bucket=${BUCKET}):`, uploadError);
      return { url: null, error: "Could not upload the photo. Please try again." };
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    console.error(`Supabase Storage upload threw (bucket=${BUCKET}):`, err);
    return { url: null, error: "Could not upload the photo. Please try again." };
  }
}

export async function uploadIssueCoverImage(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { url: null, error: "Cover image must be a JPEG, PNG, WEBP, or GIF." };
  }
  if (file.size > MAX_BYTES) {
    return { url: null, error: "Cover image must be 5MB or smaller." };
  }

  const supabase = await requireAdmin();
  const path = `issues/${randomUUID()}.${extensionFor(file.type)}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error(`Supabase Storage upload failed (bucket=${BUCKET}):`, uploadError);
      return { url: null, error: "Could not upload the cover image. Please try again." };
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    console.error(`Supabase Storage upload threw (bucket=${BUCKET}):`, err);
    return { url: null, error: "Could not upload the cover image. Please try again." };
  }
}

export async function uploadIssuePdf(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  if (file.type !== "application/pdf") {
    return { url: null, error: "File must be a PDF." };
  }
  if (file.size > PDF_MAX_BYTES) {
    return { url: null, error: "PDF must be 20MB or smaller." };
  }

  const supabase = await requireAdmin();
  const path = `issues/${randomUUID()}.pdf`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: "application/pdf", upsert: false });

    if (uploadError) {
      console.error(`Supabase Storage PDF upload failed (bucket=${BUCKET}):`, uploadError);
      return { url: null, error: "Could not upload the PDF. Please try again." };
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    console.error(`Supabase Storage PDF upload threw (bucket=${BUCKET}):`, err);
    return { url: null, error: "Could not upload the PDF. Please try again." };
  }
}

/** Upload an event image (cover or gallery). */
export async function uploadEventImage(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { url: null, error: "Image must be a JPEG, PNG, WEBP, or GIF." };
  }
  if (file.size > MAX_BYTES) {
    return { url: null, error: "Image must be 5MB or smaller." };
  }

  const supabase = await requireAdmin();
  const path = `events/${randomUUID()}.${extensionFor(file.type)}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error(`Supabase Storage upload failed (bucket=${BUCKET}):`, uploadError);
      return { url: null, error: "Could not upload the image. Please try again." };
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    console.error(`Supabase Storage upload threw (bucket=${BUCKET}):`, err);
    return { url: null, error: "Could not upload the image. Please try again." };
  }
}

/** Upload an issues archive cover image. */
export async function uploadArchiveCoverImage(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { url: null, error: "Image must be a JPEG, PNG, WEBP, or GIF." };
  }
  if (file.size > MAX_BYTES) {
    return { url: null, error: "Image must be 5MB or smaller." };
  }

  const supabase = await requireAdmin();
  const path = `archive/${randomUUID()}.${extensionFor(file.type)}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error(`Supabase Storage upload failed (bucket=${BUCKET}):`, uploadError);
      return { url: null, error: "Could not upload the cover image. Please try again." };
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    console.error(`Supabase Storage upload threw (bucket=${BUCKET}):`, err);
    return { url: null, error: "Could not upload the cover image. Please try again." };
  }
}

/** Upload a legal insight image. */
export async function uploadLegalInsightImage(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { url: null, error: "Image must be a JPEG, PNG, WEBP, or GIF." };
  }
  if (file.size > MAX_BYTES) {
    return { url: null, error: "Image must be 5MB or smaller." };
  }

  const supabase = await requireAdmin();
  const path = `insights/${randomUUID()}.${extensionFor(file.type)}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error(`Supabase Storage upload failed (bucket=${BUCKET}):`, uploadError);
      return { url: null, error: "Could not upload the image. Please try again." };
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    console.error(`Supabase Storage upload threw (bucket=${BUCKET}):`, err);
    return { url: null, error: "Could not upload the image. Please try again." };
  }
}

/** Upload a homepage highlight image. */
export async function uploadHighlightImage(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { url: null, error: "Image must be a JPEG, PNG, WEBP, or GIF." };
  }
  if (file.size > MAX_BYTES) {
    return { url: null, error: "Image must be 5MB or smaller." };
  }

  const supabase = await requireAdmin();
  const path = `highlights/${randomUUID()}.${extensionFor(file.type)}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error(`Supabase Storage upload failed (bucket=${BUCKET}):`, uploadError);
      return { url: null, error: "Could not upload the image. Please try again." };
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    console.error(`Supabase Storage upload threw (bucket=${BUCKET}):`, err);
    return { url: null, error: "Could not upload the image. Please try again." };
  }
}

/** Upload a sponsor/advertisement image or logo. */
export async function uploadSponsorImage(
  file: File
): Promise<{ url: string | null; error: string | null }> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { url: null, error: "Image must be a JPEG, PNG, WEBP, or GIF." };
  }
  if (file.size > MAX_BYTES) {
    return { url: null, error: "Image must be 5MB or smaller." };
  }

  const supabase = await requireAdmin();
  const path = `sponsors/${randomUUID()}.${extensionFor(file.type)}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (uploadError) {
      console.error(`Supabase Storage upload failed (bucket=${BUCKET}):`, uploadError);
      return { url: null, error: "Could not upload the image. Please try again." };
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { url: data.publicUrl, error: null };
  } catch (err) {
    console.error(`Supabase Storage upload threw (bucket=${BUCKET}):`, err);
    return { url: null, error: "Could not upload the image. Please try again." };
  }
}
