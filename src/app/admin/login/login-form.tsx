"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";

export function LoginForm() {
  const [error, formAction, isPending] = useActionState(login, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="font-admin text-xs font-semibold uppercase tracking-wide text-ink">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div>
        <label htmlFor="password" className="font-admin text-xs font-semibold uppercase tracking-wide text-ink">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      {error ? <p className="font-admin text-sm text-digest-red">{error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="bg-digest-red px-6 py-3 font-admin text-sm font-semibold uppercase tracking-wide text-paper disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
