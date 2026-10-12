/**
 * Request-body limit guard — the net that keeps the 413 from coming back.
 *
 * Background: the production host rejects a Function request body of
 * 4 500 000 bytes or more with `413 FUNCTION_PAYLOAD_TOO_LARGE`, *before* any
 * app code runs. Every admin form used to send its file through a Server
 * Action, so a 4.8 MB cover image was refused by the host with no readable
 * error anywhere. The fix was architectural: the browser uploads straight to
 * Storage with a signed URL and the action only ever receives the resulting
 * URL string. This spec makes that architecture a test, not a convention.
 *
 * It is static (it reads the source tree) and engine-independent, so it runs
 * once in the `node` project. `next.config.ts` runs the numeric half of the
 * same checks through `assertRequestLimits()`, which fails the BUILD — so a
 * bad limit cannot be deployed even if nobody runs the suite.
 *
 * Rules, and what breaks if one is lost:
 *
 *   1. Limits policy    — client < action < host wall, and the action ceiling
 *                         may not exceed the project's own maximum. Losing
 *                         this is how "50mb" got shipped.
 *   2. next.config.ts   — must take `bodySizeLimit` from the shared constant
 *                         and must run the build-time assertion. A literal
 *                         here is how config and reality drifted apart.
 *   3. Server actions   — no `"use server"` module may read File/Blob bytes,
 *                         or read a `*_file` / `*_files` part at all. That is
 *                         the request the host rejects, and refusing it
 *                         *inside* the action cannot help: the bytes are
 *                         already at the function by then.
 *   4. File inputs      — may exist only inside the upload kit, and the kit
 *                         must clear the input on selection. A named file
 *                         input submitted by a form is rule 3's trigger.
 *   5. Public forms     — must keep referencing the shared field caps, so a
 *                         free-text field cannot grow without bound.
 *
 * Run:  npx playwright test --project=node
 */

import { test, expect } from "@playwright/test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import {
  ACTION_BODY_LIMIT,
  ACTION_BODY_LIMIT_BYTES,
  CLIENT_PAYLOAD_LIMIT_BYTES,
  MAX_ACTION_BODY_BYTES,
  PLATFORM_BODY_WALL_BYTES,
  assertRequestLimits,
  parseSizeToBytes,
  requestLimitViolations,
} from "../src/lib/request-limits";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

/** Every file under `dir` whose name ends with one of `extensions`. */
function filesIn(dir: string, extensions: string[]): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...filesIn(full, extensions));
    else if (extensions.some((ext) => entry.endsWith(ext))) found.push(full);
  }
  return found;
}

/** Path relative to the repo root, with forward slashes, for readable output. */
function rel(path: string): string {
  return relative(ROOT, path).split(sep).join("/");
}

function read(path: string): string {
  return readFileSync(path, "utf8");
}

/** Modules that execute on the server because of the "use server" directive. */
function serverModules(): string[] {
  return filesIn(SRC, [".ts", ".tsx"]).filter((file) =>
    /^\s*["']use server["']\s*;/m.test(read(file))
  );
}

const KIT_FILES = [
  "src/components/forms/kit/image-upload.tsx",
  "src/components/forms/kit/pdf-upload.tsx",
];

/**
 * The only modules allowed to mention File/Blob in code, and why.
 *
 * Everything else in the app must treat uploads as URLs, which is what keeps a
 * form body small enough to never reach the host's wall. Add a file here only
 * if it is part of the upload path itself — never because it “also submits”.
 */
const FILE_CAPABLE = new Set([
  "src/components/forms/kit/image-upload.tsx", // reads the selection, uploads it
  "src/components/forms/kit/pdf-upload.tsx", // reads the selection, uploads it
  "src/lib/upload-client.ts", // PUTs the bytes to Storage, off-platform
  "src/lib/upload-limits.ts", // validates type/size before that PUT
  "src/app/admin/(protected)/admin-uploaders.ts", // binds a section to the uploader
  "src/lib/autosave.ts", // EXCLUDES files from autosave payloads
]);

/** The public forms that accept free text, and the actions behind them. */
const PUBLIC_FORM_FILES = [
  "src/components/forms/contact-form.tsx",
  "src/components/forms/newsletter-form.tsx",
  "src/app/admin/login/login-form.tsx",
  "src/app/contact/actions.ts",
  "src/components/forms/newsletter-actions.ts",
  "src/app/admin/actions.ts",
];

// ── 1. The numbers ────────────────────────────────────────────────────────

test.describe("request-body limits: policy", () => {
  test("the shipped limits are safe", () => {
    expect(() => assertRequestLimits()).not.toThrow();
  });

  test("the project's own ceiling is below the host wall it protects", () => {
    expect(MAX_ACTION_BODY_BYTES).toBeGreaterThan(0);
    expect(MAX_ACTION_BODY_BYTES).toBeLessThan(PLATFORM_BODY_WALL_BYTES);
  });

  test("'50mb' — the configuration that caused the production 413 — is rejected", () => {
    const problems = requestLimitViolations({
      actionLabel: "50mb",
      actionBytes: parseSizeToBytes("50mb"),
      clientBytes: CLIENT_PAYLOAD_LIMIT_BYTES,
      wallBytes: PLATFORM_BODY_WALL_BYTES,
      maxActionBytes: MAX_ACTION_BODY_BYTES,
    });
    expect(problems.length, "50mb is 52 MB — far above the 4.5 MB wall").toBeGreaterThan(0);
    expect(problems.join(" ")).toContain("MAX_ACTION_BODY_BYTES");
    expect(problems.join(" ")).toContain("PLATFORM_BODY_WALL_BYTES");
  });

  test("an action limit at or above the host wall is rejected", () => {
    // "6mb" is 6 291 456 bytes — past the 4 500 000-byte wall. (Note "4mb" is
    // 4 194 304 and would NOT trip this rule: the wall is decimal while
    // Next.js labels are binary. The 2 MB project ceiling is the tighter
    // guard, and the test below covers that one.)
    const problems = requestLimitViolations({
      actionLabel: "6mb",
      actionBytes: parseSizeToBytes("6mb"),
      clientBytes: 1024,
      wallBytes: PLATFORM_BODY_WALL_BYTES,
      maxActionBytes: 16 * 1024 * 1024,
    });
    expect(problems.join(" ")).toContain("PLATFORM_BODY_WALL_BYTES");
    expect(problems.join(" ")).not.toContain("MAX_ACTION_BODY_BYTES");
  });

  test("a label below the wall but above the project ceiling is still rejected", () => {
    const problems = requestLimitViolations({
      actionLabel: "4mb",
      actionBytes: parseSizeToBytes("4mb"),
      clientBytes: 1024,
      wallBytes: PLATFORM_BODY_WALL_BYTES,
      maxActionBytes: MAX_ACTION_BODY_BYTES,
    });
    expect(problems.join(" ")).toContain("MAX_ACTION_BODY_BYTES");
    expect(problems.join(" ")).not.toContain("PLATFORM_BODY_WALL_BYTES");
  });

  test("a client limit at or above the action limit is rejected", () => {
    const problems = requestLimitViolations({
      actionLabel: "2mb",
      actionBytes: 2 * 1024 * 1024,
      clientBytes: 2 * 1024 * 1024,
      wallBytes: PLATFORM_BODY_WALL_BYTES,
      maxActionBytes: MAX_ACTION_BODY_BYTES,
    });
    expect(problems.join(" ")).toContain("must be BELOW");
  });

  test("a label that disagrees with the numeric constant is rejected", () => {
    const problems = requestLimitViolations({
      actionLabel: "2mb",
      actionBytes: 500_000,
      clientBytes: 1000,
      wallBytes: PLATFORM_BODY_WALL_BYTES,
      maxActionBytes: MAX_ACTION_BODY_BYTES,
    });
    expect(problems.join(" ")).toContain("disagree");
  });

  test("size labels parse the way Next.js parses them", () => {
    expect(parseSizeToBytes("2mb")).toBe(2 * 1024 * 1024);
    expect(parseSizeToBytes("512kb")).toBe(512 * 1024);
    expect(parseSizeToBytes("1gb")).toBe(1024 ** 3);
    expect(parseSizeToBytes("100b")).toBe(100);
    expect(() => parseSizeToBytes("50")).toThrow();
    expect(() => parseSizeToBytes("plenty")).toThrow();
  });

  test("the editor's cap leaves the framework ceiling room", () => {
    expect(CLIENT_PAYLOAD_LIMIT_BYTES).toBeLessThan(ACTION_BODY_LIMIT_BYTES);
    expect(CLIENT_PAYLOAD_LIMIT_BYTES).toBeGreaterThan(0);
  });
});

// ── 2. The configuration ──────────────────────────────────────────────────

test.describe("request-body limits: next.config.ts", () => {
  const config = () => read(join(ROOT, "next.config.ts"));

  test("bodySizeLimit comes from the shared constant", () => {
    expect(config()).toContain("bodySizeLimit: ACTION_BODY_LIMIT");
  });

  test("no size literal is written into the config", () => {
    // A literal is how the config drifted away from the host's real limit.
    expect(config()).not.toMatch(/bodySizeLimit:\s*["'`]/);
    expect(ACTION_BODY_LIMIT).toBe("2mb");
  });

  test("the build-time assertion is wired in", () => {
    expect(config()).toContain("assertRequestLimits()");
  });
});

// ── 3. No server module can read file bytes ───────────────────────────────

test.describe("request-body limits: server actions", () => {
  test("no server module reads File/Blob bytes", () => {
    const pattern = /arrayBuffer\s*\(\)|instanceof\s+(?:File|Blob)\b|FileReader/;
    const offenders = serverModules()
      .filter((file) => pattern.test(read(file)))
      .map(rel);
    expect(
      offenders,
      "A Server Action that reads file bytes puts them in the request body, " +
        "which the host rejects with 413 above 4.5 MB. Uploads must go " +
        "browser → Storage via a signed URL (see src/lib/upload-client.ts)."
    ).toEqual([]);
  });

  test("no server module reads a *_file / *_files part", () => {
    const pattern =
      /formData\.(?:get|getAll|has)\(\s*[`"'][^`"']*_files?[`"']/;
    const offenders = serverModules()
      .filter((file) => pattern.test(read(file)))
      .map(rel);
    expect(
      offenders,
      "Reading a *_file key means the action expects file bytes in its body. " +
        "Prefer the hidden existing_*_url field the upload zone fills on " +
        "selection. Refusing the file inside the action cannot help: the " +
        "bytes have already reached the function by then."
    ).toEqual([]);
  });

  test("the editor's own size guard is still in place", () => {
    const hook = read(join(SRC, "components/forms/kit/use-autosave.ts"));
    expect(hook).toContain("CLIENT_PAYLOAD_LIMIT_BYTES");
    expect(hook).toContain("jsonByteLength");
    expect(hook).toContain("payloadTooLargeMessage");
  });

  test("the signed-upload action is the only path that mints upload URLs", () => {
    const signed = "src/app/admin/(protected)/upload-sign-actions.ts";
    expect(read(join(ROOT, signed))).toContain("requireAdmin");
    // Nothing may re-introduce a server-side uploader next to it.
    const legacy = filesIn(SRC, [".ts"]).filter(
      (file) => file !== join(ROOT, signed) && /storage\s*\.from\([^)]*\)\s*\.upload\(/.test(read(file))
    );
    expect(
      legacy.map(rel),
      "Server-side storage.upload() calls are the legacy path: they carry " +
        "file bytes through a Function. Uploads belong to the browser."
    ).toEqual([]);
  });
});

// ── 4. File inputs cannot be submitted ────────────────────────────────────

test.describe("request-body limits: file inputs", () => {
  const uiFiles = () => filesIn(SRC, [".tsx", ".ts"]);

  test("file inputs exist only inside the upload kit", () => {
    const offenders = uiFiles()
      .filter((file) => /type="file"/.test(read(file)))
      .filter((file) => !KIT_FILES.includes(rel(file)))
      .map(rel);
    expect(
      offenders,
      "A file input outside the kit has no upload-on-select path, so its bytes " +
        "would be submitted with the form — the 413. Use ImageUploadZone / " +
        "PdfUploadZone instead."
    ).toEqual([]);
  });

  test("the kit clears the file input the moment a file is selected", () => {
    for (const kit of KIT_FILES) {
      const source = read(join(ROOT, kit));
      expect(source, `${kit} must render a file input`).toContain('type="file"');
      expect(
        source,
        `${kit} must empty the input on selection, so a submitted form can never carry the file`
      ).toMatch(/\.value\s*=\s*""/);
    }
  });

  test("only the upload path mentions File/Blob in code", () => {
    // Comments are stripped first: several modules explain this rule in prose.
    const stripComments = (source: string) =>
      source
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/(^|[^:])\/\/.*$/gm, "$1");
    const offenders = filesIn(SRC, [".ts", ".tsx"])
      .filter((file) => !FILE_CAPABLE.has(rel(file)))
      .filter((file) => /\b(?:File|Blob)\b/.test(stripComments(read(file))))
      .map(rel);
    expect(
      offenders,
      "Only the upload path may handle File/Blob values. A form that takes a " +
        "File and submits it is the request the host rejects with 413; send " +
        "the URL instead (upload-on-select)."
    ).toEqual([]);
  });

  test("every admin section's form has a file input only via the kit", () => {
    const forms = filesIn(join(SRC, "app/admin"), [".tsx"]).filter((file) =>
      /<form\b/.test(read(file))
    );
    const raw = forms
      .filter((file) => /type="file"/.test(read(file)))
      .map(rel);
    expect(raw, "admin forms must not render raw file inputs").toEqual([]);
  });
});

// ── 5. Public free-text fields stay capped ────────────────────────────────

test.describe("request-body limits: public forms", () => {
  test("every public form and action references the shared field caps", () => {
    const missing = PUBLIC_FORM_FILES.filter(
      (file) => !read(join(ROOT, file)).includes("PUBLIC_FIELD_LIMITS")
    );
    expect(
      missing,
      "Each of these files must reference PUBLIC_FIELD_LIMITS so its " +
        "free-text fields stay bounded (src/lib/request-limits.ts)."
    ).toEqual([]);
  });
});
