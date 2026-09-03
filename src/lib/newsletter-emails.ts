import { SITE_URL } from "@/lib/constants";

const BRAND = {
  purple: "#6b3a7a",
  purpleDeep: "#4a1a5c",
  paper: "#F3F0EA",
  ink: "#171717",
  stone: "#6b6560",
  hairline: "#e2ddd5",
  red: "#B91C1C",
};

function wrapper(children: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:${BRAND.paper};font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${BRAND.paper};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid ${BRAND.hairline};">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND.purple};padding:32px 40px;text-align:center;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:bold;color:#ffffff;letter-spacing:0.5px;">
                LAW DIGEST
              </h1>
              <p style="margin:6px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:13px;color:rgba(255,255,255,0.75);letter-spacing:2px;text-transform:uppercase;">
                The Weekly Brief
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${children}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid ${BRAND.hairline};padding:24px 40px;text-align:center;">
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${BRAND.stone};">
                &copy; ${new Date().getFullYear()} Law Digest &mdash; Nigerian Law Digest
              </p>
              <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${BRAND.stone};">
                <a href="${SITE_URL}" style="color:${BRAND.purple};text-decoration:underline;">Visit our website</a>
                &nbsp;&middot;&nbsp;
                <a href="${SITE_URL}/about" style="color:${BRAND.purple};text-decoration:underline;">About us</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function welcomeEmailHtml(subscriberEmail: string): string {
  const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${Buffer.from(subscriberEmail).toString("base64url")}`;

  return wrapper(`
    <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${BRAND.ink};">
      Welcome to The Weekly Brief
    </h2>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:${BRAND.stone};">
      Thank you for subscribing to <strong style="color:${BRAND.ink};">Law Digest</strong> &mdash; the official newsletter for Nigerian legal analysis and updates.
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:${BRAND.stone};">
      Every week you&rsquo;ll receive curated insights from our editorial team, covering the latest in Nigerian law, practice areas, and the legal profession.
    </p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:${BRAND.stone};">
      If you have any questions, simply reply to this email or visit us at
      <a href="${SITE_URL}" style="color:${BRAND.purple};text-decoration:underline;">nglawdigest.com</a>.
    </p>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="background-color:${BRAND.purple};border-radius:4px;">
          <a href="${SITE_URL}" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;letter-spacing:0.5px;text-transform:uppercase;">
            Read Latest Articles
          </a>
        </td>
      </tr>
    </table>
    <hr style="border:none;border-top:1px solid ${BRAND.hairline};margin:0 0 16px;" />
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${BRAND.stone};line-height:1.6;">
      You&rsquo;re receiving this because you subscribed at <strong>nglawdigest.com</strong>.
      <br />
      <a href="${unsubscribeUrl}" style="color:${BRAND.red};text-decoration:underline;">Unsubscribe from this newsletter</a>
    </p>
  `);
}

export function followUpEmailHtml(subscriberEmail: string): string {
  const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${Buffer.from(subscriberEmail).toString("base64url")}`;

  return wrapper(`
    <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:${BRAND.ink};">
      Your First Week with Law Digest
    </h2>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:${BRAND.stone};">
      You subscribed to The Weekly Brief a few days ago &mdash; here&rsquo;s a taste of what you&rsquo;ll be getting every week.
    </p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:${BRAND.stone};">
      Our editorial team covers:
    </p>
    <ul style="margin:0 0 24px;padding-left:20px;font-size:16px;line-height:2;color:${BRAND.stone};">
      <li>Breaking legal developments across Nigerian courts</li>
      <li>In-depth analysis of landmark judgments and legislation</li>
      <li>Practice area insights for lawyers and legal professionals</li>
      <li>Call-for-papers and academic opportunities</li>
    </ul>
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="background-color:${BRAND.purple};border-radius:4px;">
          <a href="${SITE_URL}/articles" style="display:inline-block;padding:14px 32px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#ffffff;text-decoration:none;letter-spacing:0.5px;text-transform:uppercase;">
            Explore Articles
          </a>
        </td>
      </tr>
    </table>
    <hr style="border:none;border-top:1px solid ${BRAND.hairline};margin:0 0 16px;" />
    <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${BRAND.stone};line-height:1.6;">
      <a href="${unsubscribeUrl}" style="color:${BRAND.red};text-decoration:underline;">Unsubscribe from this newsletter</a>
    </p>
  `);
}

export function adminNotificationHtml(subscriberEmail: string, subscribedAt: Date): string {
  return wrapper(`
    <h2 style="margin:0 0 16px;font-family:Georgia,'Times New Roman',serif;font-size:20px;color:${BRAND.ink};">
      New Newsletter Subscriber
    </h2>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 16px;">
      <tr>
        <td style="padding:12px 16px;background-color:${BRAND.paper};border-left:3px solid ${BRAND.purple};">
          <p style="margin:0;font-size:14px;color:${BRAND.stone};">
            <strong style="color:${BRAND.ink};">Email:</strong> ${subscriberEmail}
          </p>
          <p style="margin:6px 0 0;font-size:14px;color:${BRAND.stone};">
            <strong style="color:${BRAND.ink};">Subscribed:</strong> ${subscribedAt.toISOString()}
          </p>
        </td>
      </tr>
    </table>
  `);
}
