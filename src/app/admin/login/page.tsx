import type { Metadata } from "next";
import { LoginForm } from "@/app/admin/login/login-form";

export const metadata: Metadata = {
  title: "Admin Login — Law Digest",
  robots: { index: false, follow: false },
};

export default function AdminLoginPage() {
  return (
    <div data-admin className="flex min-h-screen items-center justify-center bg-paper px-6">
      <div className="w-full max-w-sm">
        <p className="font-admin text-xl font-semibold text-ink">Digest</p>
        <h1 className="mt-1 font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Admin sign in
        </h1>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
