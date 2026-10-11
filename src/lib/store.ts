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

/** tag: نسخة القيمة المقروءة؛ الكتابة المشروطة تنجح فقط إن لم يغيّرها أحد بعد القراءة */
type Versioned = { data: string | null; tag: string | null };
type Backend = {
  get(key: string): Promise<Versioned>;
  set(key: string, value: string): Promise<void>;
  setIf(key: string, value: string, tag: string | null): Promise<boolean>;
};

/**
 * مخزن Netlify Blobs إن وُجد سياقه. السياق في دوال Netlify الحديثة لا يكون دائمًا في process.env
 * (قد يكون في globalThis)، فلا يُحكم بالمتغيرات بل يُجرَّب المخزن نفسه: getStore يرفض فورًا خارج Netlify.
 */
async function netlify(): Promise<Backend | null> {
  try {
    const { getStore } = await import("@netlify/blobs");
    const store = getStore({ name: STORE, consistency: "strong" });
    return {
      get: async (key) => {
        const r = await store.getWithMetadata(key, { consistency: "strong" });
        return { data: r?.data ?? null, tag: r?.etag ?? null };
      },
      set: async (key, value) => { await store.set(key, value); },
      setIf: async (key, value, tag) => (await store.set(key, value, tag ? { onlyIfMatch: tag } : { onlyIfNew: true })).modified,
    };
  } catch {
    return null;
  }
}

/** هل نعمل داخل خوادم Netlify (حيث نظام الملفات للقراءة فقط وما يُكتب فيه يضيع)؟ */
const onNetlify = () =>
  Boolean((globalThis as { Netlify?: unknown }).Netlify || process.env.NETLIFY || process.env.SITE_ID || process.env.AWS_LAMBDA_FUNCTION_NAME);

/** ملفات محلية: عملية واحدة تكتب، والتسلسل داخلها يكفي */
const file: Backend = {
  get: async (key) => {
    const f = path.join(DIR, `${key}.json`);
    return { data: existsSync(/*turbopackIgnore: true*/ f) ? readFileSync(/*turbopackIgnore: true*/ f, "utf8") : null, tag: null };
  },
  set: async (key, value) => {
    mkdirSync(/*turbopackIgnore: true*/ DIR, { recursive: true });
    const f = path.join(DIR, `${key}.json`);
    writeFileSync(/*turbopackIgnore: true*/ `${f}.tmp`, value, { mode: 0o600 });
    renameSync(/*turbopackIgnore: true*/ `${f}.tmp`, f);
  },
  setIf: async (key, value) => { await file.set(key, value); return true; },
};

async function backend(): Promise<Backend> {
  const blobs = await netlify();
  if (blobs) return blobs;
  // على Netlify بلا مخزن: خطأ واضح بدل كتابة تفشل أو تضيع بصمت
  if (onNetlify()) throw new Error("Netlify Blobs is not available for this site");
  return file;
}

const parse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
};

export async function readJson<T>(key: string, fallback: T): Promise<T> {
  return parse((await (await backend()).get(key)).data, fallback);
}

export async function writeJson(key: string, value: unknown): Promise<void> {
  await (await backend()).set(key, JSON.stringify(value));
}

/**
 * تعديل مجموعة كاملة: قراءة ثم كتابة مشروطة بأن أحدًا لم يكتب بينهما، وإلا تُعاد المحاولة على القيمة الجديدة.
 * على Netlify تعمل أكثر من نسخة من الخادم في الوقت نفسه (تواصل الفنادق مع تعديلات المالك)،
 * فبلا هذا الشرط تمسح كتابةٌ كتابةً أخرى. fn قد تُستدعى أكثر من مرة، فلا تعتمد على أنها تُستدعى مرة واحدة.
 */
let chain: Promise<unknown> = Promise.resolve();
export function update<T>(key: string, fallback: T, fn: (v: T) => T | Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const store = await backend();
    for (let attempt = 0; attempt < 10; attempt++) {
      const cur = await store.get(key);
      const next = await fn(parse(cur.data, fallback));
      const raw = JSON.stringify(next);
      // قيمة موجودة بلا رقم نسخة (خادم Blobs المحلي لا يعيده): كتابة عادية بدل شرط لن يتحقق أبدًا
      if (cur.data !== null && cur.tag === null) { await store.set(key, raw); return next; }
      if (await store.setIf(key, raw, cur.tag)) return next;
      await new Promise((r) => setTimeout(r, 30 + Math.random() * 120 * (attempt + 1)));
    }
    throw new Error(`Could not save ${key}: too many simultaneous changes`);
  });
  chain = run.catch(() => undefined);
  return run;
}
