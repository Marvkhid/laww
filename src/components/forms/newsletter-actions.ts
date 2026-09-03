"use server";

import { getTransporter, getFromAddress } from "@/lib/smtp";
import { subscribeToNewsletter } from "@/lib/supabase/public/newsletter";
import {
  welcomeEmailHtml,
  adminNotificationHtml,
} from "@/lib/newsletter-emails";
import type { NewsletterFormState } from "./newsletter-types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ADMIN_NOTIFICATION_RECIPIENT = "webmaster@nglawdigestblog.com";

async function sendWelcomeEmail(
  subscriberEmail: string,
): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    console.error("Welcome email skipped: SMTP env vars are not set.");
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: getFromAddress(),
      to: subscriberEmail,
      subject: "Welcome to The Weekly Brief — Law Digest Newsletter",
      html: welcomeEmailHtml(subscriberEmail),
    });
    console.log("Welcome email sent successfully:", info.messageId, "to:", subscriberEmail);
  } catch (err) {
    console.error("Welcome email failed to send:", err);
  }
}

async function sendAdminNotification(
  subscriberEmail: string,
  subscribedAt: Date,
): Promise<void> {
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
      html: adminNotificationHtml(subscriberEmail, subscribedAt),
    });
  } catch (err) {
    console.error("Newsletter admin notification failed to send:", err);
  }
}

export async function subscribeToNewsletterAction(
  _prevState: NewsletterFormState,
  formData: FormData,
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
  const subscribedAt = new Date();
  await sendAdminNotification(email, subscribedAt);
  await sendWelcomeEmail(email);

  return {
    status: "success",
    message: "You're subscribed — watch your inbox for The Weekly Brief.",
  };
}
