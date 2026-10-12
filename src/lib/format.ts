/** وقت نسبي بسيط: منذ دقائق، ساعات، أيام */
export function ago(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "لم يتواصل";
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (m < 2) return "الآن";
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.round(m / 60);
  if (h < 48) return `منذ ${h} ساعة`;
  return `منذ ${Math.round(h / 24)} يوم`;
}

/** متأخر عن التواصل: أكثر من يومين */
export const stale = (iso: string | null | undefined, now = Date.now()) => !iso || now - Date.parse(iso) > 48 * 3600_000;

export const day = (iso: string) => iso.slice(0, 10);

/** حالة الفندق كما يراها صاحب النظام: لون ونص واحد في كل الشاشات */
export type HotelState = "online" | "idle" | "waiting" | "suspended";
export function hotelState(h: { status: string; instance: { last_seen: string } | null }, now = Date.now()): HotelState {
  if (h.status === "suspended") return "suspended";
  if (!h.instance) return "waiting";
  // النظام المستخدَم يتواصل كل نصف دقيقة؛ آخر 3 دقائق يعني أن أحدًا يعمل عليه الآن
  return now - Date.parse(h.instance.last_seen) < 3 * 60_000 ? "online" : "idle";
}
export const STATE_LABEL: Record<HotelState, string> = {
  online: "متصل الآن", idle: "غير متصل الآن", waiting: "بانتظار الربط", suspended: "موقوف",
};
