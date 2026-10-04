/**
 * Presence-aware form reads.
 *
 * The bug class these exist to kill: a form payload that does not carry a
 * field must never be allowed to overwrite the stored value with null. Real
 * incidents this caused on this project:
 *
 *  - An autosave taken before the rich-text editor mounted carried an empty
 *    body, and the update RPC wrote `body = null` unconditionally. The
 *    article's body was destroyed and the public page fell back to
 *    "The full article body has not yet been added…".
 *  - A payload that omitted an inline-image slot cleared that image.
 *
 * The rule is simple and is enforced in one place here:
 *
 *   key PRESENT  → its value is a deliberate decision (including "" for a
 *                  Delete button).
 *   key ABSENT   → the field was never rendered or never loaded; keep what
 *                  is already stored.
 *
 * The body needs one extra signal, because its key is always rendered (the
 * hidden input exists from first paint, just empty). `TiptapEditor` writes
 * `<name>_state = "ready"` when it mounts, and the body is only trusted when
 * that flag is present. Before that, the stored body is kept.
 */

/** Is this key in the payload at all? */
export function fieldPresent(formData: FormData, key: string): boolean {
  return formData.has(key);
}

/** First value of a key, trimmed; "" → null. */
export function fieldText(formData: FormData, key: string): string | null {
  const raw = String(formData.get(key) ?? "").trim();
  return raw.length > 0 ? raw : null;
}

/**
 * Read a text field, preserving `stored` when the key is absent.
 * A present-but-empty key resolves to null (that is a deliberate clear).
 */
export function readTextPreserving(
  formData: FormData,
  key: string,
  stored: string | null | undefined
): string | null {
  if (fieldPresent(formData, key)) return fieldText(formData, key);
  return stored ?? null;
}

/**
 * Text value for a write payload, or `undefined` when the key is absent.
 *
 * This is the strongest form of the presence rule for an UPDATE: an
 * `undefined` field is dropped when the object is serialised to JSON, so
 * PostgREST omits the column entirely and the stored value is left exactly
 * as it was. Use it for any content field so that a payload which simply
 * did not carry that field can never blank it.
 */
export function readTextOptional(
  formData: FormData,
  key: string
): string | null | undefined {
  if (!fieldPresent(formData, key)) return undefined;
  return fieldText(formData, key);
}

/** Read a text column off a stored row; null when there is no row. */
export function storedText<T extends object>(
  row: T | null | undefined,
  key: keyof T
): string | null {
  const value = row?.[key];
  return typeof value === "string" ? value : null;
}

/** Has the rich-text editor declared its body trustworthy? */
export function bodyIsReady(formData: FormData, bodyField = "body"): boolean {
  return String(formData.get(`${bodyField}_state`) ?? "") === "ready";
}

/**
 * Read the rich-text body, preserving the stored one until the editor says
 * it is ready.
 *
 * `parse` turns the raw hidden-field string into a document, or returns null
 * for an empty one — each editor supplies its own emptiness rule.
 */
export function readBodyPreserving<T>(
  formData: FormData,
  stored: T | null | undefined,
  parse: (raw: string) => T | null,
  bodyField = "body"
): T | null {
  if (!bodyIsReady(formData, bodyField)) return stored ?? null;
  return parse(String(formData.get(bodyField) ?? "").trim());
}
