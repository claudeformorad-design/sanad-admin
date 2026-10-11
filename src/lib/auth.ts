import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hashPassword, hmac, random, safeEqual, verifyPassword } from "./crypto";
import { readJson, update } from "./store";

/**
 * دخول صاحب النظام وحده بكلمة مرور. أول مرة يضعها بكود إعداد لمرة واحدة (متغير ADMIN_SETUP_CODE في Netlify)،
 * وبعدها لا يُقبل الكود. الجلسة كوكي موقّع لا يقرؤه JavaScript، مدتها 12 ساعة.
 * بعد 8 محاولات خاطئة خلال 15 دقيقة يُغلق الدخول 15 دقيقة.
 */
type Admin = { password_hash: string | null; session_secret: string; failures: number; failed_since: string | null };
const COOKIE = "nz_admin";
const HOURS = 12;
const EMPTY: Admin = { password_hash: null, session_secret: "", failures: 0, failed_since: null };

async function admin(): Promise<Admin> {
  const a = await readJson<Admin>("admin", EMPTY);
  if (a.session_secret) return a;
  return update<Admin>("admin", EMPTY, (v) => (v.session_secret ? v : { ...v, session_secret: random(32) }));
}

export const isSetUp = async () => (await admin()).password_hash !== null;

export async function setupPassword(code: string, password: string): Promise<"ok" | "already" | "bad_code" | "weak"> {
  const expected = process.env.ADMIN_SETUP_CODE ?? "";
  if (await isSetUp()) return "already";
  if (!expected || !safeEqual(code.trim(), expected)) return "bad_code";
  if (password.length < 10) return "weak";
  await update<Admin>("admin", EMPTY, (v) => ({ ...v, password_hash: hashPassword(password) }));
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
  await update<Admin>("admin", EMPTY, (v) => {
    const fresh = !v.failed_since || Date.now() - Date.parse(v.failed_since) >= 15 * 60_000;
    return { ...v, failures: fresh ? 1 : v.failures + 1, failed_since: fresh ? new Date().toISOString() : v.failed_since };
  });
  return "bad";
}

export async function changePassword(current: string, next: string): Promise<"ok" | "bad" | "weak"> {
  const a = await admin();
  if (!a.password_hash || !verifyPassword(current, a.password_hash)) return "bad";
  if (next.length < 10) return "weak";
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
