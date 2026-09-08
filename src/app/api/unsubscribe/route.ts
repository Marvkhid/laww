import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/client";
import { SITE_URL } from "@/lib/constants";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new NextResponse("Missing token.", { status: 400 });
  }

  let email: string;
  try {
    email = Buffer.from(token, "base64url").toString("utf-8");
  } catch {
    return new NextResponse("Invalid token.", { status: 400 });
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .delete()
    .eq("email", email);

  if (error) {
    console.error("Unsubscribe failed:", error);
    return new NextResponse("Something went wrong. Please try again.", {
      status: 500,
    });
  }

  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><title>Unsubscribed</title></head>
<body style="font-family:Georgia,serif;background:#F3F0EA;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;">
  <div style="text-align:center;padding:40px;max-width:480px;">
    <h1 style="color:#171717;font-size:24px;">You've been unsubscribed</h1>
    <p style="color:#6b6560;font-size:16px;line-height:1.6;">
      You will no longer receive emails from The Weekly Brief.
      <br/><br/>
      <a href="${SITE_URL}" style="color:#6b3a7a;text-decoration:underline;">Return to Law Digest</a>
    </p>
  </div>
</body>
</html>`,
    {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}
