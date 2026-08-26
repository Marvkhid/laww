import nodemailer from "nodemailer";

// Generic SMTP configuration — no Gmail-specific setup.
// Populate these environment variables with your SMTP provider's details.
//
// Required env vars:
//   SMTP_HOST     — e.g. "smtp.yourprovider.com"
//   SMTP_PORT     — e.g. 587 (TLS) or 465 (SSL)
//   SMTP_USER     — e.g. "webmaster@nglawdigestblog.com"
//   SMTP_PASSWORD — your SMTP password or app-specific password
//   SMTP_FROM     — sender address, e.g. "webmaster@nglawdigestblog.com"
//
// The transporter is created lazily on first use and cached.
// If SMTP env vars are not set, all mail functions silently skip
// sending and log a warning — the subscriber's success state is
// never affected by mail infrastructure issues.

let cachedTransporter: nodemailer.Transporter | null = null;

export function getTransporter(): nodemailer.Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !port || !user || !pass) {
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port: Number(port),
    secure: Number(port) === 465,
    auth: { user, pass },
  });

  return cachedTransporter;
}

export function getFromAddress(): string {
  return process.env.SMTP_FROM || "webmaster@nglawdigestblog.com";
}
