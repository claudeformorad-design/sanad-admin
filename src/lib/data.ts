import "server-only";
import { randomUUID } from "node:crypto";
import { activationCode, random } from "./crypto";
import { readJson, update } from "./store";
import { SECTION_KEYS } from "./sections";

/** فندق مباع: أقسامه وحالته وكود ربطه، والنظام المربوط به (نسخة على الموقع أو على جهاز) */
export type Hotel = {
  id: string;
  name: string;
  contact: string;
  sections: string[];
  status: "active" | "suspended";
  code: string;
  notes: string;
  created_at: string;
  updated_at: string;
  instance: Instance | null;
};

export type Instance = {
  id: string;
  /** السر المشترك: يوقّع به النظام طلباته، ويبقى في مخزن اللوحة الخاص فقط */
  secret: string;
  mode: "cloud" | "installer";
  machine: string | null;
  url: string | null;
  version: string | null;
  activated_at: string;
  last_seen: string;
};

export type Notice = {
  id: string;
  title: string;
  body: string;
  level: "info" | "important";
  /** "all" لكل الفنادق، أو قائمة معرّفات فنادق */
  target: "all" | string[];
  starts_at: string;
  ends_at: string | null;
  created_at: string;
};

const HOTELS = "hotels";
const NOTICES = "notices";

export const listHotels = () => readJson<Hotel[]>(HOTELS, []);
export const getHotel = async (id: string) => (await listHotels()).find((h) => h.id === id) ?? null;

const cleanSections = (s: string[]) => [...new Set(s.filter((k) => SECTION_KEYS.includes(k)))];

export async function createHotel(input: { name: string; contact: string; sections: string[]; notes: string }): Promise<Hotel> {
  const now = new Date().toISOString();
  const hotel: Hotel = {
    id: randomUUID(), name: input.name, contact: input.contact, sections: cleanSections(input.sections), status: "active",
    code: activationCode(), notes: input.notes, created_at: now, updated_at: now, instance: null,
  };
  await update<Hotel[]>(HOTELS, [], (all) => [...all, hotel]);
  return hotel;
}

export async function updateHotel(id: string, patch: Partial<Pick<Hotel, "name" | "contact" | "sections" | "status" | "notes">>): Promise<Hotel | null> {
  let out: Hotel | null = null;
  await update<Hotel[]>(HOTELS, [], (all) => all.map((h) => {
    if (h.id !== id) return h;
    out = { ...h, ...patch, ...(patch.sections ? { sections: cleanSections(patch.sections) } : {}), updated_at: new Date().toISOString() };
    return out;
  }));
  return out;
}

/** فصل النظام المربوط وإصدار كود جديد (عند تغيير الجهاز أو إعادة النشر) */
export async function resetActivation(id: string): Promise<void> {
  await update<Hotel[]>(HOTELS, [], (all) => all.map((h) => (h.id === id ? { ...h, instance: null, code: activationCode(), updated_at: new Date().toISOString() } : h)));
}

export async function deleteHotel(id: string): Promise<void> {
  await update<Hotel[]>(HOTELS, [], (all) => all.filter((h) => h.id !== id));
}

/**
 * ربط نظام بفندق بكود الربط. الكود يُستخدم مرة واحدة: بعد الربط لا يقبل نظامًا آخر حتى يُعاد من اللوحة.
 * يعيد السر المشترك للنظام مرة واحدة، ولا يظهر في واجهة اللوحة.
 */
export async function activate(code: string, info: { mode: "cloud" | "installer"; machine: string | null; url: string | null; version: string | null }):
  Promise<{ hotel: Hotel; secret: string } | { error: "invalid_code" | "already_linked" | "suspended" }> {
  const normalized = code.trim().toUpperCase();
  let result: { hotel: Hotel; secret: string } | { error: "invalid_code" | "already_linked" | "suspended" } = { error: "invalid_code" };
  await update<Hotel[]>(HOTELS, [], (all) => all.map((h) => {
    if (h.code !== normalized) return h;
    if (h.status === "suspended") { result = { error: "suspended" }; return h; }
    if (h.instance) { result = { error: "already_linked" }; return h; }
    const secret = random(32);
    const now = new Date().toISOString();
    const hotel: Hotel = { ...h, instance: { id: randomUUID(), secret, mode: info.mode, machine: info.machine, url: info.url, version: info.version, activated_at: now, last_seen: now } };
    result = { hotel, secret };
    return hotel;
  }));
  return result;
}

export async function findByInstance(instanceId: string): Promise<Hotel | null> {
  return (await listHotels()).find((h) => h.instance?.id === instanceId) ?? null;
}

export async function touchInstance(hotelId: string, info: { version: string | null; url: string | null }): Promise<void> {
  // التواصل كل دقيقتين: لا يُكتب "آخر ظهور" إلا كل 5 دقائق أو عند تغير النسخة والرابط، توفيرًا للمخزن
  const cur = (await listHotels()).find((h) => h.id === hotelId)?.instance;
  if (cur && Date.now() - Date.parse(cur.last_seen) < 5 * 60_000 && (info.version ?? cur.version) === cur.version && (info.url ?? cur.url) === cur.url) return;
  await update<Hotel[]>(HOTELS, [], (all) => all.map((h) => (h.id === hotelId && h.instance
    ? { ...h, instance: { ...h.instance, last_seen: new Date().toISOString(), version: info.version ?? h.instance.version, url: info.url ?? h.instance.url } }
    : h)));
}

// ---------------------------------------------------------------- الإشعارات
export const listNotices = async () => (await readJson<Notice[]>(NOTICES, [])).sort((a, b) => b.created_at.localeCompare(a.created_at));

export async function createNotice(input: Omit<Notice, "id" | "created_at">): Promise<Notice> {
  const n: Notice = { ...input, id: randomUUID(), created_at: new Date().toISOString() };
  await update<Notice[]>(NOTICES, [], (all) => [...all, n]);
  return n;
}

export async function deleteNotice(id: string): Promise<void> {
  await update<Notice[]>(NOTICES, [], (all) => all.filter((n) => n.id !== id));
}

/** الإشعارات السارية لفندق الآن */
export async function noticesFor(hotelId: string, now = new Date()): Promise<Notice[]> {
  const t = now.toISOString();
  return (await listNotices()).filter((n) =>
    (n.target === "all" || n.target.includes(hotelId)) && n.starts_at <= t && (!n.ends_at || n.ends_at > t));
}
