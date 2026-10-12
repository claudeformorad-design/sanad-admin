import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hashPassword, hmac, random, safeEqual, sha256, verifyPassword } from "./crypto";
import { readJson, update } from "./store";
import { strongPassword } from "./password";

/**
 * دخول صاحب النظام وحده بكلمة مرور قوية (10 أحرف فأكثر فيها حرف ورقم ورمز). أول مرة يضعها بكود إعداد لمرة واحدة (متغير ADMIN_SETUP_CODE في Netlify)،
 * وبعدها لا يُقبل الكود. الجلسة كوكي موقّع لا يقرؤه JavaScript، مدتها 12 ساعة.
 * بعد 8 محاولات خاطئة خلال 15 دقيقة يُغلق الدخول 15 دقيقة.
 */
/** reset_used: بصمة آخر كود استعادة استُخدم، فلا يُقبل مرة ثانية */
type Admin = { password_hash: string | null; session_secret: string; failures: number; failed_since: string | null; reset_used?: string | null };
const COOKIE = "nz_admin";
const HOURS = 12;
const EMPTY: Admin = { password_hash: null, session_secret: "", failures: 0, failed_since: null };

async function admin(): Promise<Admin> {
  const a = await readJson<Admin>("admin", EMPTY);
  if (a.session_secret) return a;
  return update<Admin>("admin", EMPTY, (v) => (v.session_secret ? v : { ...v, session_secret: random(32) }));
}

export const isSetUp = async () => (await admin()).password_hash !== null;

/**
 * توحيد كتابة الكود قبل المقارنة: حروف كبيرة، بلا مسافات أو شرطات، والأرقام العربية تُقرأ لاتينية.
 * فيُقبل الكود كيفما كُتب (4a2h jedc 457d أو ٤A2H-JEDC-٤٥٧D).
 */
const normalizeCode = (s: string) =>
  s.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .toUpperCase().replace(/[^A-Z0-9]/g, "");

/** هل ضُبط كود الإعداد في إعدادات الموقع؟ بدونه لا يمكن الإعداد الأول أصلًا */
export const setupCodeConfigured = () => normalizeCode(process.env.ADMIN_SETUP_CODE ?? "").length >= 6;

/** هل الكود صحيح؟ بمقارنة ثابتة الزمن */
export async function checkSetupCode(code: string): Promise<boolean> {
  if (!setupCodeConfigured()) return false;
  return safeEqual(normalizeCode(code), normalizeCode(process.env.ADMIN_SETUP_CODE ?? ""));
}

export async function setupPassword(code: string, password: string): Promise<"ok" | "already" | "bad_code" | "weak"> {
  if (await isSetUp()) return "already";
  if (!(await checkSetupCode(code))) return "bad_code";
  if (!strongPassword(password)) return "weak";
  await update<Admin>("admin", EMPTY, (v) => ({ ...v, password_hash: hashPassword(password) }));
  await startSession();
  return "ok";
}

/**
 * استعادة كلمة مرور منسية: كود استعادة يضعه صاحب النظام في إعدادات الموقع (ADMIN_RESET_CODE).
 * كل كود يعمل مرة واحدة، ولاستعادة أخرى يوضع كود جديد. المحاولات الخاطئة تُحسب مع محاولات الدخول،
 * وبعد 8 خلال ربع ساعة يُغلق الاثنان. الاستعادة تُخرج كل الأجهزة، ولا تمس الفنادق.
 */
export const resetCodeConfigured = () => normalizeCode(process.env.ADMIN_RESET_CODE ?? "").length >= 6;

const locked = (a: Admin) => !!a.failed_since && Date.now() - Date.parse(a.failed_since) < 15 * 60_000 && a.failures >= 8;

/** الدقائق الباقية على فتح الدخول بعد المحاولات الخاطئة (1 على الأقل وهو مقفل، و0 إن لم يكن مقفلًا) */
export async function lockMinutesLeft(): Promise<number> {
  const a = await admin();
  if (!locked(a)) return 0;
  return Math.max(1, Math.ceil((Date.parse(a.failed_since!) + 15 * 60_000 - Date.now()) / 60_000));
}

async function countFailure(): Promise<void> {
  await update<Admin>("admin", EMPTY, (v) => {
    const fresh = !v.failed_since || Date.now() - Date.parse(v.failed_since) >= 15 * 60_000;
    return { ...v, failures: fresh ? 1 : v.failures + 1, failed_since: fresh ? new Date().toISOString() : v.failed_since };
  });
}

export async function checkResetCode(code: string): Promise<"ok" | "bad" | "used" | "locked" | "off"> {
  if (!resetCodeConfigured()) return "off";
  const a = await admin();
  if (locked(a)) return "locked";
  const expected = normalizeCode(process.env.ADMIN_RESET_CODE ?? "");
  if (!safeEqual(normalizeCode(code), expected)) { await countFailure(); return "bad"; }
  if (a.reset_used === sha256(expected)) return "used";
  return "ok";
}

export async function resetPassword(code: string, password: string): Promise<"ok" | "bad" | "used" | "locked" | "off" | "weak"> {
  const r = await checkResetCode(code);
  if (r !== "ok") return r;
  if (!strongPassword(password)) return "weak";
  const used = sha256(normalizeCode(process.env.ADMIN_RESET_CODE ?? ""));
  await update<Admin>("admin", EMPTY, (v) => ({ ...v, password_hash: hashPassword(password), session_secret: random(32), failures: 0, failed_since: null, reset_used: used }));
  await startSession();
  return "ok";
}

export async function login(password: string): Promise<"ok" | "bad" | "locked"> {
  const a = await admin();
  const since = a.failed_since ? Date.parse(a.failed_since) : 0;
  const recent = Date.now() - since < 15 * 60_000;
  if (recent && a.failures >= 8) return "locked";
  if (a.password_hash && verifyPassword(password, a.password_hash)) {
    await update<Admin>("admin", EMPTY, (v) => ({ ...v, failures: 0, failed_since: null }));
    await startSession();
    return "ok";
  }
  await countFailure();
  return "bad";
}

export async function changePassword(current: string, next: string): Promise<"ok" | "bad" | "weak"> {
  const a = await admin();
  if (!a.password_hash || !verifyPassword(current, a.password_hash)) return "bad";
  if (!strongPassword(next)) return "weak";
  // سر جلسات جديد: كل الأجهزة المسجّلة تخرج
  await update<Admin>("admin", EMPTY, (v) => ({ ...v, password_hash: hashPassword(next), session_secret: random(32) }));
  await startSession();
  return "ok";
}

async function startSession(): Promise<void> {
  const a = await admin();
  const exp = String(Date.now() + HOURS * 3600_000);
  (await cookies()).set(COOKIE, `${exp}.${hmac(a.session_secret, exp)}`, {
    httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production" && !process.env.LOCAL_HTTP, path: "/", maxAge: HOURS * 3600,
  });
}

export async function logout(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function isSignedIn(): Promise<boolean> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return false;
  const [exp, sig] = raw.split(".");
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  const a = await admin();
  return a.password_hash !== null && safeEqual(sig, hmac(a.session_secret, exp));
}

/** كل صفحة وإجراء في اللوحة يبدأ بها */
export async function requireAdmin(): Promise<void> {
  if (!(await isSignedIn())) redirect((await isSetUp()) ? "/login" : "/setup");
}
