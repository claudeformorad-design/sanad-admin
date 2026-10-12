import "server-only";
import { randomUUID } from "node:crypto";
import { activationCode, random } from "./crypto";
import { readJson, update, writeJson } from "./store";
import { SECTION_KEYS } from "./sections";
import { type Catalog, cleanBlocked, cleanBlockedPermissions } from "./catalog";

/** فندق مباع: أقسامه وحالته وكود ربطه، والنظام المربوط به (نسخة على الموقع أو على جهاز) */
export type Hotel = {
  id: string;
  name: string;
  contact: string;
  sections: string[];
  /** صفحات وخانات وأزرار أوقفها صاحب النظام داخل الأقسام (مفاتيح الفهرس) */
  blocked?: string[];
  /** صلاحيات أوقفها صاحب النظام: تسقط من كل موظفي الفندق حتى المدير العام */
  blocked_permissions?: string[];
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
  /** بصمة فهرس نسخة الفندق (ما يمكن إيقافه فيها)، والفهرس نفسه محفوظ باسمها */
  catalog_hash?: string | null;
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
/** الأنظمة المفصولة من اللوحة: تأخذ إشعار فصل موقّعًا في أول تواصل */
const REVOKED = "revoked";

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

// ---------------------------------------------------------------- فهرس نسخة كل فندق
const catalogKey = (hash: string) => `catalog-${hash}`;
export const hasCatalog = async (hash: string) => (await readJson<Catalog | null>(catalogKey(hash), null)) !== null;
export const saveCatalog = (hash: string, catalog: Catalog) => writeJson(catalogKey(hash), catalog);
/** فهرس نسخة الفندق إن وصل من نظامه، وإلا null فيُستخدم الاحتياطي */
export async function catalogFor(hotel: Pick<Hotel, "instance">): Promise<Catalog | null> {
  const hash = hotel.instance?.catalog_hash;
  return hash ? readJson<Catalog | null>(catalogKey(hash), null) : null;
}

export async function updateHotel(id: string, patch: Partial<Pick<Hotel, "name" | "contact" | "sections" | "blocked" | "blocked_permissions" | "status" | "notes">>): Promise<Hotel | null> {
  let out: Hotel | null = null;
  const catalog = patch.blocked || patch.blocked_permissions ? await catalogFor((await getHotel(id)) ?? { instance: null }) : null;
  await update<Hotel[]>(HOTELS, [], (all) => all.map((h) => {
    if (h.id !== id) return h;
    out = {
      ...h, ...patch,
      ...(patch.sections ? { sections: cleanSections(patch.sections) } : {}),
      ...(patch.blocked ? { blocked: cleanBlocked(patch.blocked, catalog) } : {}),
      ...(patch.blocked_permissions ? { blocked_permissions: cleanBlockedPermissions(patch.blocked_permissions, catalog) } : {}),
      updated_at: new Date().toISOString(),
    };
    return out;
  }));
  return out;
}

/** فصل النظام المربوط وإصدار كود جديد (عند تغيير الجهاز أو إعادة النشر) */
export async function resetActivation(id: string): Promise<void> {
  const old = (await getHotel(id))?.instance?.id;
  await update<Hotel[]>(HOTELS, [], (all) => all.map((h) => (h.id === id ? { ...h, instance: null, code: activationCode(), updated_at: new Date().toISOString() } : h)));
  if (old) await revoke(old);
}

export async function deleteHotel(id: string): Promise<void> {
  const old = (await getHotel(id))?.instance?.id;
  await update<Hotel[]>(HOTELS, [], (all) => all.filter((h) => h.id !== id));
  if (old) await revoke(old);
}

async function revoke(instanceId: string): Promise<void> {
  await update<string[]>(REVOKED, [], (all) => [...new Set([...all, instanceId])].slice(-500));
}

export const isRevoked = async (instanceId: string) => (await readJson<string[]>(REVOKED, [])).includes(instanceId);

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

export async function touchInstance(hotelId: string, info: { version: string | null; url: string | null; catalog_hash?: string | null }): Promise<void> {
  // النظام يتواصل كل نصف دقيقة أثناء استخدامه: "آخر ظهور" يُكتب مرة في الدقيقة على الأكثر، توفيرًا للمخزن
  const cur = (await listHotels()).find((h) => h.id === hotelId)?.instance;
  const hash = info.catalog_hash ?? cur?.catalog_hash ?? null;
  if (cur && Date.now() - Date.parse(cur.last_seen) < 60_000 && (info.version ?? cur.version) === cur.version && (info.url ?? cur.url) === cur.url
    && hash === (cur.catalog_hash ?? null)) return;
  await update<Hotel[]>(HOTELS, [], (all) => all.map((h) => (h.id === hotelId && h.instance
    ? { ...h, instance: { ...h.instance, last_seen: new Date().toISOString(), version: info.version ?? h.instance.version, url: info.url ?? h.instance.url,
        catalog_hash: info.catalog_hash ?? h.instance.catalog_hash ?? null } }
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
