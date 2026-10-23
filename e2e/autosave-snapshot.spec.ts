/**
 * Autosave recovery snapshots (Node, engine-independent — see the `node`
 * project).
 *
 * The defect these tests exist to stop, in production terms: publishing
 * article A left its recovery snapshot — content AND A's row id — under the
 * shared `/admin/articles/new` key. The next "New Article" editor silently
 * restored it, so the new story was written INTO article A: the previously
 * published article appeared to be deleted or replaced, and the new form
 * appeared to be pre-filled with somebody else's article.
 *
 * The policy under test lives in `lib/autosave.ts`:
 *
 *  · every snapshot is stamped with the token of the tab's editor session,
 *  · a token is stable across reloads of the SAME tab (crash recovery still
 *    works) but distinct per tab (a second editor can never inherit — or
 *    adopt — another session's content or row id), and
 *  · only a snapshot carrying this tab's token is ever trusted; a legacy
 *    (un-tokened) snapshot from an older deploy is never trusted.
 *
 * The hook that applies this policy (`components/forms/kit/use-autosave.ts`)
 * only restores when `snapshotBelongsToEditor` is true, and the admin layout
 * clears snapshots everywhere except an editor route.
 */

import { test, expect } from "@playwright/test";
import {
  SNAPSHOT_PREFIX,
  SESSION_PREFIX,
  clearAllSnapshots,
  clearSnapshot,
  editorSessionToken,
  readSnapshot,
  snapshotBelongsToEditor,
  writeSnapshot,
  type AutosaveSnapshot,
} from "../src/lib/autosave";

/** The smallest Storage that satisfies the lib's duck-typed access. */
class FakeStorage implements Storage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null;
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
}

type WindowWithStorage = { localStorage: Storage; sessionStorage: Storage };

const realWindow = (globalThis as { window?: unknown }).window;

/**
 * A browser owns localStorage (shared by every tab) — that sharing is the
 * whole hazard. A tab owns sessionStorage, which is what makes the token
 * per-editor rather than per-browser.
 */
function openBrowser(): { localStorage: FakeStorage } {
  return { localStorage: new FakeStorage() };
}

function openTab(
  browser: { localStorage: FakeStorage } = openBrowser()
): { window: WindowWithStorage; localStorage: FakeStorage; sessionStorage: FakeStorage } {
  const sessionStorage = new FakeStorage();
  return {
    window: { localStorage: browser.localStorage, sessionStorage },
    localStorage: browser.localStorage,
    sessionStorage,
  };
}

function enterTab(tab: ReturnType<typeof openTab>): void {
  (globalThis as { window?: unknown }).window = tab.window;
}

function leaveTab(): void {
  if (realWindow === undefined) {
    delete (globalThis as { window?: unknown }).window;
  } else {
    (globalThis as { window?: unknown }).window = realWindow;
  }
}

test.afterEach(() => leaveTab());

const SCOPE = "/admin/articles/new";

function snapshot(overrides: Partial<AutosaveSnapshot> = {}): AutosaveSnapshot {
  return {
    id: "article-a",
    data: { title: ["[E2E] article A"], slug: ["e2e-article-a"] },
    savedAt: Date.now(),
    token: "tab-one-token",
    ...overrides,
  };
}

test.describe("editor session tokens", () => {
  test("are stable for one tab across a reload of the same route", () => {
    const tab = openTab();
    enterTab(tab);

    const before = editorSessionToken(SCOPE);
    // A reload keeps sessionStorage, so crash/refresh recovery still works.
    expect(editorSessionToken(SCOPE)).toBe(before);

    // …and the token written to storage is what a later mount reads back.
    expect(tab.sessionStorage.getItem(`${SESSION_PREFIX}${SCOPE}`)).toBe(before);
  });

  test("differ per route, so editors cannot cross-contaminate", () => {
    enterTab(openTab());
    const newEditor = editorSessionToken("/admin/articles/new");
    const editEditor = editorSessionToken("/admin/articles/abc/edit");
    expect(newEditor).not.toBe(editEditor);
  });

  test("differ per TAB for the same route — a second editor inherits nothing", () => {
    const browser = openBrowser();
    const tabOne = openTab(browser);
    enterTab(tabOne);
    const tokenOne = editorSessionToken(SCOPE);

    // Same browser, second tab: sessionStorage is per-tab by design.
    const tabTwo = openTab(browser);
    enterTab(tabTwo);
    const tokenTwo = editorSessionToken(SCOPE);
    expect(tokenTwo).not.toBe(tokenOne);

    // Tab one is unaffected by tab two having asked for a token.
    enterTab(tabOne);
    expect(editorSessionToken(SCOPE)).toBe(tokenOne);
  });
});

test.describe("snapshot ownership", () => {
  test("a snapshot written by this tab belongs to this tab", () => {
    const tab = openTab();
    enterTab(tab);

    const mine = snapshot({ token: editorSessionToken(SCOPE) });
    writeSnapshot(SCOPE, mine);

    const stored = readSnapshot(SCOPE);
    expect(stored).not.toBeNull();
    expect(stored!.token).toBe(mine.token);
    expect(snapshotBelongsToEditor(stored!, SCOPE)).toBe(true);
  });

  test("another tab's snapshot is never trusted — the article-replacement defect", () => {
    const browser = openBrowser();
    const tabOne = openTab(browser);
    enterTab(tabOne);
    // Tab one published article A and left its recovery copy behind.
    writeSnapshot(SCOPE, snapshot({ id: "article-a", token: editorSessionToken(SCOPE) }));

    // The admin opens "New Article" in a SECOND tab of the same browser —
    // localStorage is shared, so the leftover is sitting right there.
    const tabTwo = openTab(browser);
    enterTab(tabTwo);
    expect(tabTwo.localStorage.getItem(`${SNAPSHOT_PREFIX}${SCOPE}`)).not.toBeNull();
    const leftover = readSnapshot(SCOPE);
    expect(leftover, "the snapshot is still on disk — it must be refused").not.toBeNull();
    expect(snapshotBelongsToEditor(leftover!, SCOPE)).toBe(false);
  });

  test("a legacy (un-tokened) snapshot is never trusted", () => {
    const tab = openTab();
    enterTab(tab);
    // Exactly what a pre-token deploy left in localStorage: no `token` key.
    const legacy = snapshot();
    delete legacy.token;
    tab.localStorage.setItem(`${SNAPSHOT_PREFIX}${SCOPE}`, JSON.stringify(legacy));

    const stored = readSnapshot(SCOPE);
    expect(stored).not.toBeNull();
    // Its row id is a PUBLISHED article — adopting it is what replaced it.
    expect(stored!.id).toBe("article-a");
    expect(snapshotBelongsToEditor(stored!, SCOPE)).toBe(false);
  });

  test("ownership is judged per route, not globally", () => {
    const tab = openTab();
    enterTab(tab);
    const token = editorSessionToken(SCOPE);
    const mine = snapshot({ token });

    // Written while editing a specific article…
    expect(snapshotBelongsToEditor(mine, "/admin/articles/abc/edit")).toBe(false);
    // …and it is this tab's, for the route it was written on.
    expect(snapshotBelongsToEditor(mine, SCOPE)).toBe(true);
  });
});

test.describe("snapshot housekeeping", () => {
  test("clearSnapshot removes only that route's copy", () => {
    const tab = openTab();
    enterTab(tab);
    writeSnapshot(SCOPE, snapshot());
    writeSnapshot("/admin/lawyer-news/new", snapshot({ id: "entry-b" }));

    clearSnapshot(SCOPE);
    expect(readSnapshot(SCOPE)).toBeNull();
    expect(readSnapshot("/admin/lawyer-news/new")).not.toBeNull();
  });

  test("clearAllSnapshots sweeps every editor route but no other key", () => {
    const tab = openTab();
    enterTab(tab);
    writeSnapshot(SCOPE, snapshot());
    writeSnapshot("/admin/lawyer-news/new", snapshot({ id: "entry-b" }));
    tab.localStorage.setItem("some-unrelated-pref", "keep me");

    clearAllSnapshots();
    expect(readSnapshot(SCOPE)).toBeNull();
    expect(readSnapshot("/admin/lawyer-news/new")).toBeNull();
    expect(tab.localStorage.getItem("some-unrelated-pref")).toBe("keep me");
  });
});
