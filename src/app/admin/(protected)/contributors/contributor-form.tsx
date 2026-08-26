"use client";

import { useActionState, useState } from "react";
import type { ContributorRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/contributors/actions";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

export function ContributorForm({
  action,
  initial,
  submitLabel,
}: {
  action: ActionFn;
  initial?: Pick<
    ContributorRow,
    "slug" | "name" | "credentials" | "role" | "bio" | "photo_url" | "is_editorial_board"
  >;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const [photoPreview, setPhotoPreview] = useState<string | null>(initial?.photo_url ?? null);

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-4">
      <div>
        <label htmlFor="name" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          defaultValue={initial?.name}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div>
        <label htmlFor="slug" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Slug
        </label>
        <input
          id="slug"
          name="slug"
          type="text"
          required
          defaultValue={initial?.slug}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
        <p className="mt-1 font-admin text-xs text-[#333]">
          Sets the public URL at /contributors/[slug] — edited directly, not generated from the
          name.
        </p>
      </div>
      <div>
        <label htmlFor="role" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Role
        </label>
        <input
          id="role"
          name="role"
          type="text"
          required
          defaultValue={initial?.role}
          placeholder="e.g. Contributor, Editor-in-Chief"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div>
        <label
          htmlFor="credentials"
          className="font-admin text-xs font-medium uppercase tracking-wide text-ink"
        >
          Credentials <span className="normal-case text-[#333]">(optional)</span>
        </label>
        <input
          id="credentials"
          name="credentials"
          type="text"
          defaultValue={initial?.credentials ?? ""}
          placeholder="e.g. SAN, LL.M"
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div>
        <label htmlFor="bio" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
          Bio <span className="normal-case text-[#333]">(optional)</span>
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          defaultValue={initial?.bio ?? ""}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div>
        <label
          htmlFor="photo_file"
          className="font-admin text-xs font-medium uppercase tracking-wide text-ink"
        >
          Profile Photo <span className="normal-case text-[#333]">(optional)</span>
        </label>
        {photoPreview ? (
          <div className="mt-2 flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreview}
              alt="Photo preview"
              className="h-20 w-20 rounded-full object-cover border border-hairline"
            />
            <button
              type="button"
              onClick={() => {
                setPhotoPreview(null);
                const input = document.getElementById("photo_file") as HTMLInputElement | null;
                if (input) input.value = "";
              }}
              className="font-admin text-xs text-digest-red hover:text-digest-red-deep"
            >
              Remove
            </button>
          </div>
        ) : null}
        <input
          id="photo_file"
          name="photo_file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) setPhotoPreview(URL.createObjectURL(file));
          }}
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
        <input
          type="hidden"
          name="existing_photo_url"
          value={initial?.photo_url ?? ""}
        />
        <p className="mt-1 font-admin text-xs text-[#333]">
          JPEG, PNG, WEBP, or GIF, up to 5MB. Leave empty to keep the current photo.
        </p>
      </div>
      <label className="flex items-center gap-2 font-admin text-sm text-ink">
        <input
          type="checkbox"
          name="is_editorial_board"
          defaultChecked={initial?.is_editorial_board}
        />
        Editorial board member (vs. article contributor)
      </label>
      {state.error ? <p className="font-admin text-sm text-digest-red">{state.error}</p> : null}
      <button
        type="submit"
        disabled={isPending}
        className="w-fit bg-digest-red px-6 py-3 font-admin text-sm uppercase tracking-wide text-paper disabled:opacity-60"
      >
        {isPending ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
