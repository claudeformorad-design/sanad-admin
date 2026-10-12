import { NextResponse } from "next/server";
import { z } from "zod";
import { hmac, safeEqual } from "@/lib/crypto";
import { findByInstance, hasCatalog, isRevoked, noticesFor, saveCatalog, touchInstance } from "@/lib/data";
import { catalogHash, isCatalog } from "@/lib/catalog";
import { issueLicense, issueRevocation } from "@/lib/license";
import { publicNotice } from "@/lib/api";

/**
 * تواصل دوري من نظام الفندق: يثبت هويته بتوقيع الطلب بسرّه المشترك (HMAC على الوقت والمحتوى)،
 * فيأخذ ترخيصه الحالي (الأقسام والحالة) والإشعارات السارية. الطلب القديم (أكثر من 10 دقائق) يُرفض.
 */
const body = z.object({
  version: z.string().trim().max(40).nullable().optional(),
  url: z.string().trim().max(300).nullable().optional(),
  /** بصمة فهرس نسخة الفندق، والفهرس نفسه حين تطلبه اللوحة (need_catalog) */
  catalog_hash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  catalog: z.unknown().optional(),
});
/** حد حجم التواصل: الفهرس نحو 30 كيلوبايت، وما فوق نصف ميجابايت يُرفض */
const MAX_BODY = 512 * 1024;

export async function POST(request: Request) {
  const id = request.headers.get("x-instance-id") ?? "";
  const ts = request.headers.get("x-timestamp") ?? "";
  const sig = request.headers.get("x-signature") ?? "";
  const raw = await request.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: "too_large" }, { status: 413 });
  if (!id || !ts || !sig) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // ساعة جهاز الفندق قد تكون خاطئة (أو منطقته الزمنية): يُعاد وقت اللوحة ليعيد النظام التوقيع به مرة واحدة
  if (!Number.isFinite(Number(ts)) || Math.abs(Date.now() - Number(ts)) > 10 * 60_000) {
    return NextResponse.json({ error: "clock", now: Date.now() }, { status: 401 });
  }
  const hotel = await findByInstance(id);
  // نظام فصله صاحب النظام (نقل أو حذف): إشعار فصل موقّع يوقفه ويطلب كودًا جديدًا
  if (!hotel && (await isRevoked(id))) return NextResponse.json({ error: "revoked", revocation: await issueRevocation(id) }, { status: 410 });
  // السر لا يُرسل أبدًا: التوقيع وحده يثبت أن الطلب من النظام المربوط
  if (!hotel?.instance || !safeEqual(sig, hmac(hotel.instance.secret, `${ts}.${raw}`))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let parsed: unknown = {};
  try { parsed = raw ? JSON.parse(raw) : {}; } catch { return NextResponse.json({ error: "validation" }, { status: 400 }); }
  const p = body.safeParse(parsed);
  if (!p.success) return NextResponse.json({ error: "validation" }, { status: 400 });
  // فهرس نسخة الفندق: يُحفظ إن طابق بصمته وصح شكله، ويُطلب إن كانت البصمة جديدة على اللوحة
  let catalogHashKnown: string | null = null;
  let needCatalog = false;
  if (p.data.catalog_hash) {
    if (p.data.catalog !== undefined && catalogHash(p.data.catalog) === p.data.catalog_hash && isCatalog(p.data.catalog)) {
      await saveCatalog(p.data.catalog_hash, p.data.catalog);
      catalogHashKnown = p.data.catalog_hash;
    } else if (p.data.catalog_hash === hotel.instance.catalog_hash || (await hasCatalog(p.data.catalog_hash))) {
      catalogHashKnown = p.data.catalog_hash;
    } else needCatalog = p.data.catalog === undefined;
  }
  await touchInstance(hotel.id, { version: p.data.version ?? null, url: p.data.url ?? null, catalog_hash: catalogHashKnown });
  const license = await issueLicense(hotel, { instanceId: hotel.instance.id, machine: hotel.instance.machine });
  return NextResponse.json({ license, notices: (await noticesFor(hotel.id)).map(publicNotice), ...(needCatalog ? { need_catalog: true } : {}) });
}
