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
