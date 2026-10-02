"use client";

import { CheckboxField } from "@/components/forms/kit/field";
import type { PageOption } from "@/lib/page-visibility";

/**
 * "Display On" — the page-targeting checkbox group.
 *
 * Posts repeated `show_on_pages` values that the server action stores in the
 * row's show_on_pages text[]; the public queries filter on that same column.
 * The hidden `page_targeting` marker tells the server action the group was
 * actually rendered, so an unavailable column can never silently drop a
 * selection (the action reports it instead).
 */
export function PageVisibilityField({
  options,
  selected,
  label = "Display On",
  description,
  checked,
  onToggle,
}: {
  options: PageOption[];
  /** Keys that start ticked. */
  selected: string[];
  label?: string;
  description?: string;
  /** Controlled state per key — supply when one checkbox drives another. */
  checked?: Record<string, boolean>;
  onToggle?: (key: string, isChecked: boolean) => void;
}) {
  return (
    <div>
      <div className="mb-1">
        <span className="font-admin text-[11px] font-semibold uppercase tracking-[0.12em] text-stone">
          {label}
        </span>
        {description ? (
          <p className="mt-1 font-admin text-xs text-stone">{description}</p>
        ) : null}
      </div>
      <div className="grid gap-x-8 sm:grid-cols-2">
        {options.map((option, index) => (
          <CheckboxField
            key={option.key}
            name="show_on_pages"
            value={option.key}
            label={option.label}
            defaultChecked={
              checked ? undefined : selected.includes(option.key)
            }
            checked={checked ? checked[option.key] ?? false : undefined}
            onChange={
              checked ? (isChecked) => onToggle?.(option.key, isChecked) : undefined
            }
            index={index}
          />
        ))}
      </div>
      <input type="hidden" name="page_targeting" value="enabled" />
    </div>
  );
}
