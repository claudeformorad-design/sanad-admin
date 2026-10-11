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
    sections: hotel.sections, status: hotel.status, updates: "forever", issued_at: new Date().toISOString(),
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${signWith((await signingKeys()).privatePem, body)}`;
}
