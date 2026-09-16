"use client";

import { useActionState } from "react";
import { login } from "@/app/admin/actions";
import { TextField } from "@/components/forms/kit/field";
import { SubmitButton } from "@/components/forms/kit/submit-button";

export function LoginForm() {
  const [error, formAction, isPending] = useActionState(login, null);

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <TextField
        label="Email"
        id="email"
        name="email"
        type="email"
        required
        autoComplete="username"
        placeholder="admin@nglawdigest.com"
        index={0}
      />
      <TextField
        label="Password"
        id="password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        placeholder="••••••••"
        index={1}
      />
      {error ? (
        <p role="alert" className="flex items-center gap-2 font-admin text-sm font-medium text-digest-red">
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-digest-red" />
          {error}
        </p>
      ) : null}
      <SubmitButton
        label="Sign in"
        pendingLabel="Signing in…"
        isPending={isPending}
        fullWidth
      />
    </form>
  );
}
