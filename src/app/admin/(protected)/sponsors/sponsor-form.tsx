"use client";

import { useActionState, useState } from "react";
import type { SponsorRow } from "@/lib/supabase/types";
import type { FormState } from "@/app/admin/(protected)/sponsors/actions";

type ActionFn = (prevState: FormState, formData: FormData) => Promise<FormState>;

export function SponsorForm({
  action,
  initial,
  submitLabel,
}: {
  action: ActionFn;
  initial?: Pick<
    SponsorRow,
    "name" | "logo_url" | "website_url" | "tier" | "placement" | "image_url" | "display_order" | "page_number" | "active"
  >;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, { error: null });
  const [logoPreview, setLogoPreview] = useState<string | null>(initial?.logo_url ?? null);
  const [imagePreview, setImagePreview] = useState<string | null>(initial?.image_url ?? null);

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

      {/* Logo Image Upload */}
      <fieldset className="border border-hairline p-4">
        <legend className="font-admin text-xs font-medium uppercase tracking-wide text-ink px-1">
          Logo Image
        </legend>
        {logoPreview ? (
          <div className="mt-2 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoPreview}
              alt="Logo preview"
              className="h-16 w-auto border border-hairline object-contain"
            />
            <button
              type="button"
              onClick={() => {
                setLogoPreview(null);
                const input = document.getElementById("logo_file") as HTMLInputElement | null;
                if (input) input.value = "";
              }}
              className="mt-2 font-admin text-xs text-digest-red hover:text-digest-red-deep"
            >
              Remove logo
            </button>
          </div>
        ) : (
          <p className="mt-2 font-admin text-xs text-[#333]">No logo uploaded yet.</p>
        )}
        <input
          id="logo_file"
          name="logo_file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) setLogoPreview(URL.createObjectURL(file));
          }}
          className="mt-2 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
        <input type="hidden" name="existing_logo_url" value={initial?.logo_url ?? ""} />
        <p className="mt-1 font-admin text-xs text-[#333]">
          JPEG, PNG, WEBP, or GIF, up to 5MB. Leave empty to keep the current logo.
        </p>
      </fieldset>

      {/* Banner Image Upload */}
      <fieldset className="border border-hairline p-4">
        <legend className="font-admin text-xs font-medium uppercase tracking-wide text-ink px-1">
          Banner Ad Image <span className="normal-case text-[#333]">(optional)</span>
        </legend>
        {imagePreview ? (
          <div className="mt-2 mb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePreview}
              alt="Banner preview"
              className="h-32 w-full border border-hairline object-contain"
            />
            <button
              type="button"
              onClick={() => {
                setImagePreview(null);
                const input = document.getElementById("image_file") as HTMLInputElement | null;
                if (input) input.value = "";
              }}
              className="mt-2 font-admin text-xs text-digest-red hover:text-digest-red-deep"
            >
              Remove banner
            </button>
          </div>
        ) : (
          <p className="mt-2 font-admin text-xs text-[#333]">No banner image uploaded yet.</p>
        )}
        <input
          id="image_file"
          name="image_file"
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) setImagePreview(URL.createObjectURL(file));
          }}
          className="mt-2 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
        <input type="hidden" name="existing_image_url" value={initial?.image_url ?? ""} />
        <p className="mt-1 font-admin text-xs text-[#333]">
          Wider banner image for ad placements. Leave empty to keep the current banner.
        </p>
      </fieldset>

      <div>
        <label
          htmlFor="website_url"
          className="font-admin text-xs font-medium uppercase tracking-wide text-ink"
        >
          Website URL <span className="normal-case text-[#333]">(optional)</span>
        </label>
        <input
          id="website_url"
          name="website_url"
          type="url"
          defaultValue={initial?.website_url ?? ""}
          placeholder="https://..."
          className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="tier" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
            Tier <span className="normal-case text-[#333]">(optional)</span>
          </label>
          <input
            id="tier"
            name="tier"
            type="text"
            defaultValue={initial?.tier ?? ""}
            placeholder="e.g. Platinum"
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          />
        </div>
        <div>
          <label htmlFor="placement" className="font-admin text-xs font-medium uppercase tracking-wide text-ink">
            Placement
          </label>
          <select
            id="placement"
            name="placement"
            defaultValue={initial?.placement ?? "all"}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          >
            <option value="all">All pages</option>
            <option value="homepage">Homepage only</option>
            <option value="article_page">Article pages</option>
            <option value="sidebar">Sidebar</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="display_order"
            className="font-admin text-xs font-medium uppercase tracking-wide text-ink"
          >
            Display order
          </label>
          <input
            id="display_order"
            name="display_order"
            type="number"
            step="1"
            defaultValue={initial?.display_order ?? 0}
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          />
        </div>
        <div>
          <label
            htmlFor="sponsor_page_number"
            className="font-admin text-xs font-medium uppercase tracking-wide text-ink"
          >
            Page Number <span className="normal-case text-[#333]">(optional)</span>
          </label>
          <input
            id="sponsor_page_number"
            name="page_number"
            type="number"
            min={1}
            step={1}
            defaultValue={initial?.page_number ?? ""}
            placeholder="e.g. 5"
            className="mt-1 w-full border border-[#c8c3bb] bg-white px-4 py-3 font-admin text-sm text-ink"
          />
        </div>
      </div>
      <label className="flex items-center gap-2 font-admin text-sm text-ink">
        <input
          type="checkbox"
          name="active"
          defaultChecked={initial?.active ?? true}
          className="h-4 w-4 border border-hairline"
        />
        Active (visible on the public site)
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
