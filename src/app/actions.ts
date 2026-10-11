"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { changePassword, checkSetupCode, isSetUp, login, logout, requireAdmin, setupCodeConfigured, setupPassword } from "@/lib/auth";
import { createHotel, createNotice, deleteHotel, deleteNotice, getHotel, resetActivation, updateHotel } from "@/lib/data";
import { issueLicense } from "@/lib/license";

export type FormState = { error?: string; ok?: string; key?: string } | null;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const list = (f: FormData, k: string) => f.getAll(k).map(String);

/** فحص كود الإعداد قبل خطوة كلمة المرور (لا يستهلكه) */
export async function checkSetupCodeAction(code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (await isSetUp()) return { ok: false, error: "اللوحة مُعدّة مسبقًا، ادخل بكلمة المرور" };
  if (!setupCodeConfigured()) return { ok: false, error: "كود الإعداد غير مضبوط في إعدادات الموقع على Netlify (المتغير ADMIN_SETUP_CODE)" };
  const r = await checkSetupCode(String(code ?? ""));
  return r ? { ok: true } : { ok: false, error: "كود الإعداد غير صحيح" };
}

export async function setupAction(_: FormState, f: FormData): Promise<FormState> {
  if (str(f, "password") !== str(f, "confirm")) return { error: "كلمتا المرور غير متطابقتين" };
  const r = await setupPassword(str(f, "code"), str(f, "password"));
  if (r === "already") redirect("/login");
  if (r === "bad_code") return { error: "كود الإعداد غير صحيح" };
  if (r === "weak") return { error: "كلمة المرور لازم 10 أحرف أو أكثر، وفيها حرف ورقم ورمز" };
  redirect("/");
}

export async function loginAction(_: FormState, f: FormData): Promise<FormState> {
  const r = await login(str(f, "password"));
  if (r === "locked") return { error: "محاولات كثيرة خاطئة، حاول بعد ربع ساعة" };
  if (r === "bad") return { error: "كلمة المرور غير صحيحة" };
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/login");
}

export async function changePasswordAction(_: FormState, f: FormData): Promise<FormState> {
  await requireAdmin();
  if (str(f, "next") !== str(f, "confirm")) return { error: "كلمتا المرور غير متطابقتين" };
  const r = await changePassword(str(f, "current"), str(f, "next"));
  if (r === "bad") return { error: "كلمة المرور الحالية غير صحيحة" };
  if (r === "weak") return { error: "كلمة المرور لازم 10 أحرف أو أكثر، وفيها حرف ورقم ورمز" };
  return { ok: "تغيّرت كلمة المرور، وخرجت كل الأجهزة الأخرى" };
}

const hotelSchema = z.object({
  name: z.string().min(2, "اكتب اسم الفندق").max(120),
  contact: z.string().max(160),
  notes: z.string().max(1000),
  sections: z.array(z.string()).refine((s) => s.includes("pms") || s.includes("accounting"), "اختر الحجوزات أو المحاسبة على الأقل"),
});

export async function createHotelAction(_: FormState, f: FormData): Promise<FormState> {
  await requireAdmin();
  const p = hotelSchema.safeParse({ name: str(f, "name"), contact: str(f, "contact"), notes: str(f, "notes"), sections: list(f, "sections") });
  if (!p.success) return { error: p.error.issues[0]?.message ?? "تحقق من البيانات" };
  const h = await createHotel(p.data);
  revalidatePath("/");
  redirect(`/hotels/${h.id}?created=1`);
}

export async function saveHotelAction(_: FormState, f: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(f, "id");
  const p = hotelSchema.safeParse({ name: str(f, "name"), contact: str(f, "contact"), notes: str(f, "notes"), sections: list(f, "sections") });
  if (!p.success) return { error: p.error.issues[0]?.message ?? "تحقق من البيانات" };
  if (!(await updateHotel(id, p.data))) return { error: "الفندق غير موجود" };
  revalidatePath("/");
  revalidatePath(`/hotels/${id}`);
  return { ok: "حُفظ. يصل التغيير لنظام الفندق في أول تواصل" };
}

export async function setStatusAction(id: string, status: "active" | "suspended"): Promise<void> {
  await requireAdmin();
  await updateHotel(id, { status });
  revalidatePath("/");
  revalidatePath(`/hotels/${id}`);
}

export async function resetActivationAction(id: string): Promise<void> {
  await requireAdmin();
  await resetActivation(id);
  revalidatePath(`/hotels/${id}`);
}

export async function deleteHotelAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteHotel(id);
  revalidatePath("/");
  redirect("/");
}

/** مفتاح يدوي لنسخة تثبيت بلا إنترنت: مربوط ببصمة الجهاز التي تظهر في شاشة التفعيل */
export async function offlineKeyAction(_: FormState, f: FormData): Promise<FormState> {
  await requireAdmin();
  const hotel = await getHotel(str(f, "id"));
  const machine = str(f, "machine").toUpperCase();
  if (!hotel) return { error: "الفندق غير موجود" };
  if (!/^[A-Z0-9-]{8,64}$/.test(machine)) return { error: "اكتب رقم الجهاز كما يظهر في شاشة التفعيل" };
  return { key: await issueLicense(hotel, { instanceId: null, machine }) };
}

const noticeSchema = z.object({
  title: z.string().min(2, "اكتب عنوان الإشعار").max(120),
  body: z.string().min(2, "اكتب نص الإشعار").max(1500),
  level: z.enum(["info", "important"]),
  target: z.union([z.literal("all"), z.array(z.uuid()).min(1, "اختر فندقًا واحدًا على الأقل")]),
  ends_at: z.string().nullable(),
});

export async function createNoticeAction(_: FormState, f: FormData): Promise<FormState> {
  await requireAdmin();
  const ends = str(f, "ends_on");
  const p = noticeSchema.safeParse({
    title: str(f, "title"), body: str(f, "body"), level: str(f, "level") === "important" ? "important" : "info",
    target: str(f, "audience") === "some" ? list(f, "hotels") : "all",
    ends_at: /^\d{4}-\d{2}-\d{2}$/.test(ends) ? new Date(`${ends}T23:59:59Z`).toISOString() : null,
  });
  if (!p.success) return { error: p.error.issues[0]?.message ?? "تحقق من البيانات" };
  await createNotice({ ...p.data, starts_at: new Date().toISOString() });
  revalidatePath("/notices");
  return { ok: "أُرسل الإشعار. يظهر عند الفنادق في أول تواصل" };
}

export async function deleteNoticeAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteNotice(id);
  revalidatePath("/notices");
}
