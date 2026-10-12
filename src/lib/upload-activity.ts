/**
 * In-flight upload registry — the smallest possible shared state.
 *
 * Why it is needed: Save/Publish must not run while a file is still being
 * uploaded. Previously a Save clicked during an upload submitted the form with
 * the chosen file still attached, so the request body carried the bytes — the
 * exact shape the production host rejects with HTTP 413
 * (`FUNCTION_PAYLOAD_TOO_LARGE`, measured ceiling 4 500 000 bytes on the
 * deployment).
 *
 * Clearing the file input on selection already guarantees the form body never
 * contains a file; this registry adds the other half — Save waits (briefly and
 * with a hard bound) for uploads to finish so the URL they resolve to is part
 * of what gets saved, instead of being left behind by a redirect.
 *
 * It is deliberately a plain module counter rather than React context: the
 * upload zones and the save buttons sit in different subtrees, and several
 * zones can be uploading at once.
 */

let active = 0;
const listeners = new Set<() => void>();

function notify(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      /* a listener must never break an upload */
    }
  });
}

/** Register an upload that is about to start. */
export function beginUploadActivity(): void {
  active += 1;
  notify();
}

/** Register that an attempt has settled (success, failure or cancel). */
export function endUploadActivity(): void {
  active = Math.max(0, active - 1);
  notify();
}

/** How many uploads are currently running. */
export function activeUploadActivity(): number {
  return active;
}

/**
 * Resolve once no upload is running, or after `timeoutMs` — never waits
 * forever. The bound matters: Save must always get through even if an upload
 * is wedged, and by then the form body is already small.
 */
export function waitForUploadActivity(timeoutMs: number): Promise<boolean> {
  if (active === 0) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (completed: boolean) => {
      if (settled) return;
      settled = true;
      listeners.delete(onChange);
      clearTimeout(timer);
      resolve(completed);
    };
    const onChange = () => {
      if (active === 0) finish(true);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    listeners.add(onChange);
  });
}
