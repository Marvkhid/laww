import { redirect } from "next/navigation";
import { createSupabaseAuthServerClient } from "@/lib/supabase/server-client";
import { logout } from "@/app/admin/actions";

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
          <p className="font-admin text-lg font-semibold text-ink">Digest Admin</p>
          <form action={logout}>
            <button
              type="submit"
              className="rounded border border-hairline px-4 py-2 font-admin text-[11px] font-medium uppercase tracking-[0.15em] text-stone transition-all duration-200 hover:border-digest-red hover:text-digest-red"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
