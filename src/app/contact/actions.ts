"use server";

import { getTransporter, getFromAddress } from "@/lib/smtp";

export type ContactFormState = {
  status: "idle" | "success" | "error" | "sending";
  message: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendContactMessage(
  _prevState: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const subject = String(formData.get("subject") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || name.length < 2) {
    return { status: "error", message: "Please enter your name." };
  }
  if (!email || !EMAIL_PATTERN.test(email)) {
    return { status: "error", message: "Please enter a valid email address." };
  }
  if (!subject || subject.length < 3) {
    return { status: "error", message: "Please enter a subject." };
  }
  if (!message || message.length < 10) {
    return { status: "error", message: "Please enter a message (at least 10 characters)." };
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.error("Contact form: SMTP env vars are not set. Cannot send email.");
    return {
      status: "error",
      message: "Email service is not configured. Please try again later or email us directly at webmaster@nglawdigestblog.com.",
    };
  }

  try {
    await transporter.sendMail({
      from: getFromAddress(),
      to: "webmaster@nglawdigestblog.com",
      replyTo: email,
      subject: `[Law Digest Contact] ${category ? `[${category}] ` : ""}${subject}`,
      text:
        `Name: ${name}\n` +
        `Email: ${email}\n` +
        `Category: ${category || "General"}\n` +
        `Subject: ${subject}\n\n` +
        message,
      html:
        `<p><strong>Name:</strong> ${name}</p>` +
        `<p><strong>Email:</strong> ${email}</p>` +
        `<p><strong>Category:</strong> ${category || "General"}</p>` +
        `<p><strong>Subject:</strong> ${subject}</p>` +
        `<hr/>` +
        `<p>${message.replace(/\n/g, "<br/>")}</p>`,
    });

    return {
      status: "success",
      message: "Thank you for your message. We'll respond as soon as possible.",
    };
  } catch (err) {
    console.error("Contact form email failed:", err);
    return {
      status: "error",
      message: "Failed to send your message. Please try again or email us directly.",
    };
  }
}
