import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server-client";
import { exitToSite, logout } from "@/app/admin/actions";
import { AdminSessionGuard } from "@/app/admin/(protected)/session-guard";

// The secure check. proxy.ts already does a fast, optimistic redirect for
// unauthenticated cookies, but per Next.js's own guidance that shouldn't be
// the only line of defense — this re-verifies against the auth server itself
// before rendering anything under /admin (excluding /admin/login, which
// lives outside this route group).
export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseAuthServerClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/admin/login");
  }

  return (
    <div data-admin className="min-h-screen bg-paper-warm">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/admin" className="font-admin text-lg font-semibold text-ink transition-colors hover:text-digest-red">Digest Admin</Link>
          <div className="flex items-center gap-3">
            {/*
              Leaving the admin area for the public site ends the admin
              session (server-side — see src/proxy.ts), so this exit is
              explicit and labelled rather than a surprise on the way back.
            */}
            <form action={exitToSite}>
              <button
                type="submit"
                className="rounded border border-hairline px-4 py-2 font-admin text-[11px] font-semibold uppercase tracking-[0.15em] text-ink transition-all duration-200 hover:border-digest-red hover:text-digest-red"
              >
                View site (signs out)
              </button>
            </form>
            <form action={logout}>
              <button
                type="submit"
                className="rounded border border-hairline px-4 py-2 font-admin text-[11px] font-semibold uppercase tracking-[0.15em] text-ink transition-all duration-200 hover:border-digest-red hover:text-digest-red"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <AdminSessionGuard />
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
