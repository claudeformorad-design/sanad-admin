import "server-only";
import { b64url, newSigningKeys, signWith } from "./crypto";
import { readJson, update } from "./store";
import type { Hotel } from "./data";

/**
 * الترخيص: بيانات الفندق موقّعة بمفتاح اللوحة الخاص (Ed25519). نظام الفندق يحمل المفتاح العام فقط،
 * فيتحقق من التوقيع ولا يستطيع إصدار ترخيص. الصيغة: base64url(JSON) + "." + base64url(التوقيع).
 * البيع دائم والتحديثات مجانية للأبد، فلا تاريخ انتهاء؛ الإيقاف يصل للنظام المتصل بحالة suspended.
 */
export type LicensePayload = {
  v: 1;
  kind: "nazeel-license";
  hotel_id: string;
  hotel_name: string;
  /** النظام المربوط بكود الربط، أو null لمفتاح يدوي */
  instance_id: string | null;
  /** بصمة الجهاز لمفتاح يدوي لنسخة التثبيت، أو null */
  machine: string | null;
  sections: string[];
  /** صفحات وخانات وأزرار أوقفها صاحب النظام داخل الأقسام */
  blocked: string[];
  /** صلاحيات أوقفها صاحب النظام لكل موظفي الفندق حتى المدير */
  blocked_permissions: string[];
  status: "active" | "suspended";
  updates: "forever";
  issued_at: string;
};

type Signing = { privatePem: string; publicKey: string; created_at: string };

/** مفاتيح التوقيع: تُنشأ مرة واحدة وتبقى في مخزن اللوحة الخاص */
export async function signingKeys(): Promise<Signing> {
  const existing = await readJson<Signing | null>("signing", null);
  if (existing) return existing;
  const next = await update<Signing | null>("signing", null, (v) => v ?? { ...newSigningKeys(), created_at: new Date().toISOString() });
  return next!;
}

export async function issueLicense(hotel: Hotel, opts: { instanceId: string | null; machine: string | null }): Promise<string> {
  const payload: LicensePayload = {
    v: 1, kind: "nazeel-license", hotel_id: hotel.id, hotel_name: hotel.name, instance_id: opts.instanceId, machine: opts.machine,
    sections: hotel.sections, blocked: hotel.blocked ?? [], blocked_permissions: hotel.blocked_permissions ?? [], status: hotel.status, updates: "forever", issued_at: new Date().toISOString(),
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${signWith((await signingKeys()).privatePem, body)}`;
}

/**
 * إشعار فصل موقّع: يُعطى لنظام فُصل من اللوحة (نقل لجهاز آخر أو حذف الفندق) حين يتواصل،
 * فيتوقف ويطلب كود ربط جديد. موقّع بالمفتاح الخاص، فلا يستطيع أحد غير اللوحة إيقاف نظام فندق.
 */
export async function issueRevocation(instanceId: string): Promise<string> {
  const body = b64url(JSON.stringify({ v: 1, kind: "nazeel-revocation", instance_id: instanceId, issued_at: new Date().toISOString() }));
  return `${body}.${signWith((await signingKeys()).privatePem, body)}`;
}
