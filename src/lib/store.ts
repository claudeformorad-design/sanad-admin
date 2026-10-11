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

/**
 * مخزن Netlify Blobs إن وُجد سياقه. السياق في دوال Netlify الحديثة لا يكون دائمًا في process.env
 * (قد يكون في globalThis)، فلا يُحكم بالمتغيرات بل يُجرَّب المخزن نفسه: getStore يرفض فورًا خارج Netlify.
 */
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

/** هل نعمل داخل خوادم Netlify (حيث نظام الملفات للقراءة فقط وما يُكتب فيه يضيع)؟ */
const onNetlify = () =>
  Boolean((globalThis as { Netlify?: unknown }).Netlify || process.env.NETLIFY || process.env.SITE_ID || process.env.AWS_LAMBDA_FUNCTION_NAME);

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

async function backend(): Promise<Backend> {
  const blobs = await netlify();
  if (blobs) return blobs;
  // على Netlify بلا مخزن: خطأ واضح بدل كتابة تفشل أو تضيع بصمت
  if (onNetlify()) throw new Error("Netlify Blobs is not available for this site");
  return file;
}

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
