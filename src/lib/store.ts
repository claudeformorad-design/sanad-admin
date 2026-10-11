import "server-only";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

/**
 * تخزين اللوحة: على Netlify في مخزن Netlify Blobs الخاص بالموقع (لا تقرؤه إلا دوال الخادم)،
 * وعند التشغيل محليًا في مجلد .data بجوار المشروع (أو LOCAL_DATA_DIR).
 * كل مجموعة (الفنادق، الإشعارات، الإعدادات) ملف JSON واحد: اللوحة لمستخدم واحد وعدد الفنادق محدود.
 */
const STORE = "nazeel-admin";
const DIR = path.resolve(/*turbopackIgnore: true*/ process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".data"));

type Backend = { get(key: string): Promise<string | null>; set(key: string, value: string): Promise<void> };

async function netlify(): Promise<Backend | null> {
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore({ name: STORE, consistency: "strong" });
    return {
      get: async (key) => (await store.get(key, { type: "text" })) ?? null,
      set: async (key, value) => { await store.set(key, value); },
    };
  } catch {
    return null;
  }
}

const file: Backend = {
  get: async (key) => {
    const f = path.join(DIR, `${key}.json`);
    return existsSync(/*turbopackIgnore: true*/ f) ? readFileSync(/*turbopackIgnore: true*/ f, "utf8") : null;
  },
  set: async (key, value) => {
    mkdirSync(/*turbopackIgnore: true*/ DIR, { recursive: true });
    const f = path.join(DIR, `${key}.json`);
    writeFileSync(/*turbopackIgnore: true*/ `${f}.tmp`, value, { mode: 0o600 });
    renameSync(/*turbopackIgnore: true*/ `${f}.tmp`, f);
  },
};

const backend = async () => (process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT ? ((await netlify()) ?? file) : file);

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await (await backend()).get(key);
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await (await backend()).set(key, JSON.stringify(value));
}

/** تعديل مجموعة كاملة بقراءتها ثم كتابتها، بالتسلسل داخل العملية الواحدة */
let chain: Promise<unknown> = Promise.resolve();
export function update<T>(key: string, fallback: T, fn: (v: T) => T | Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const next = await fn(await readJson(key, fallback));
    await writeJson(key, next);
    return next;
  });
  chain = run.catch(() => undefined);
  return run;
}
