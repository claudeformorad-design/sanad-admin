import { describe, expect, it, vi } from "vitest";

/**
 * على Netlify تعمل عدة نسخ من الخادم معًا، لكل منها ذاكرتها. تُحاكى هنا بنسخ مستقلة من وحدة التخزين
 * فوق مخزن يتصرف كـ Netlify Blobs (رقم نسخة لكل قيمة، وكتابة مشروطة به)، مع تأخير عشوائي يخلط الطلبات.
 * كل تعديل متزامن يجب أن يبقى، ولا تمسح كتابةٌ كتابةً.
 */
const data = new Map<string, { value: string; etag: string }>();
let version = 0;
const pause = () => new Promise((r) => setTimeout(r, Math.random() * 6));
let withEtags = true;

vi.mock("@netlify/blobs", () => ({
  getStore: () => ({
    get: async (key: string) => { await pause(); return data.get(key)?.value ?? null; },
    getWithMetadata: async (key: string) => {
      await pause();
      const e = data.get(key);
      return e ? { data: e.value, etag: withEtags ? e.etag : undefined, metadata: {} } : null;
    },
    set: async (key: string, value: string, opts: { onlyIfMatch?: string; onlyIfNew?: boolean } = {}) => {
      await pause();
      const e = data.get(key);
      if (opts.onlyIfNew && e) return { modified: false };
      if (opts.onlyIfMatch && e?.etag !== opts.onlyIfMatch) return { modified: false };
      const etag = `"v${++version}"`;
      data.set(key, { value, etag });
      return { modified: true, etag };
    },
  }),
}));

const instance = async () => {
  vi.resetModules();
  return import("@/lib/store");
};

describe("store on Netlify Blobs", () => {
  it("keeps every change made at the same time by different server copies", async () => {
    const copies = [await instance(), await instance(), await instance()];
    expect(copies[0]!.update).not.toBe(copies[1]!.update);
    await Promise.all(Array.from({ length: 60 }, (_, i) => copies[i % 3]!.update<number[]>("list", [], (v) => [...v, i])));
    const final = await copies[0]!.readJson<number[]>("list", []);
    expect(final.sort((x, y) => x - y)).toEqual(Array.from({ length: 60 }, (_, i) => i));
  });

  it("creates a value only once when two copies race to create it", async () => {
    const a = await instance();
    const b = await instance();
    const [x, y] = await Promise.all([
      a.update<string | null>("signing", null, (v) => v ?? "key-from-a"),
      b.update<string | null>("signing", null, (v) => v ?? "key-from-b"),
    ]);
    expect(x).toBe(y);
    expect(await a.readJson<string | null>("signing", null)).toBe(x);
  });

  it("still saves when the store gives no version numbers (local Blobs server)", async () => {
    withEtags = false;
    const a = await instance();
    await a.update<number>("plain", 0, (v) => v + 1);
    await a.update<number>("plain", 0, (v) => v + 1);
    expect(await a.readJson<number>("plain", 0)).toBe(2);
    withEtags = true;
  });
});
