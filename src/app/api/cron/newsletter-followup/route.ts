import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { getTransporter, getFromAddress } from "@/lib/smtp";
import { followUpEmailHtml } from "@/lib/newsletter-emails";

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: Request) {
  // Protect against unauthorised calls.
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const transporter = getTransporter();
  if (!transporter) {
    console.error("Follow-up cron skipped: SMTP env vars are not set.");
    return NextResponse.json({ sent: 0, reason: "SMTP not configured" });
  }

  const supabase = createSupabaseServerClient();

  // Find subscribers who signed up ≥ 3 days ago and haven't received the
  // follow-up yet. Cap at 50 per run to avoid long-running requests.
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

  const { data: subscribers, error: fetchError } = await supabase
    .from("newsletter_subscribers")
    .select("id, email")
    .eq("follow_up_sent", false)
    .lte("created_at", threeDaysAgo.toISOString())
    .limit(50);

  if (fetchError) {
    console.error("Follow-up cron fetch failed:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!subscribers || subscribers.length === 0) {
    return NextResponse.json({ sent: 0 });
  }

  let sent = 0;
  const from = getFromAddress();

  for (const sub of subscribers) {
    try {
      await transporter.sendMail({
        from,
        to: sub.email,
        subject: "Your First Week with Law Digest",
        html: followUpEmailHtml(sub.email),
      });

      // Mark as sent.
      await supabase
        .from("newsletter_subscribers")
        .update({ follow_up_sent: true })
        .eq("id", sub.id);

      sent++;
    } catch (err) {
      console.error(`Follow-up email failed for ${sub.email}:`, err);
    }
  }

  return NextResponse.json({ sent });
}
