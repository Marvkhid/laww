"use server";

import { getTransporter, getFromAddress } from "@/lib/smtp";
import { subscribeToNewsletter } from "@/lib/supabase/public/newsletter";
import type { NewsletterFormState } from "./newsletter-types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ADMIN_NOTIFICATION_RECIPIENT = "webmaster@nglawdigestblog.com";

// Best-effort only: a failed admin notification must never affect the
// subscriber's own success state (requirement 7). Errors are caught and
// logged here so callers never need their own try/catch.
async function sendAdminNotification(subscriberEmail: string, subscribedAt: Date): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    console.error("Newsletter admin notification skipped: SMTP env vars are not set.");
    return;
  }

  try {
    await transporter.sendMail({
      from: getFromAddress(),
      to: ADMIN_NOTIFICATION_RECIPIENT,
      subject: "New Law Digest Newsletter Subscriber",
      text:
        `A new subscriber joined the Law Digest newsletter.\n\n` +
        `Email: ${subscriberEmail}\n` +
        `Subscribed: ${subscribedAt.toISOString()}`,
    });
  } catch (err) {
    console.error("Newsletter admin notification failed to send:", err);
  }
}

export async function subscribeToNewsletterAction(
  _prevState: NewsletterFormState,
  formData: FormData
): Promise<NewsletterFormState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();

  if (!email || !EMAIL_PATTERN.test(email)) {
    return { status: "error", message: "Enter a valid email address." };
  }

  const { error, duplicate } = await subscribeToNewsletter(email);

  if (duplicate) {
    return { status: "already_subscribed", message: "You're already on the list." };
  }
  if (error) {
    return { status: "error", message: "Something went wrong. Please try again." };
  }

  // Only reached for a genuinely new subscriber — never on duplicate or error.
  await sendAdminNotification(email, new Date());

  return {
    status: "success",
    message: "You're subscribed — watch your inbox for The Weekly Brief.",
  };
}
