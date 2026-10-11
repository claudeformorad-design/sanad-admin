/**
 * أقسام نظام نزيل التي تُباع للفندق. المفاتيح نفسها في نظام الفندق (src/lib/features/registry.ts)،
 * فإن أُضيف قسم هناك يُضاف هنا بنفس المفتاح.
 */
export const SECTIONS = [
  { key: "pms", label: "الحجوزات والاستقبال", core: true },
  { key: "accounting", label: "المحاسبة", core: true },
  { key: "pos", label: "نقاط البيع" },
  { key: "maintenance", label: "الصيانة" },
  { key: "lost_found", label: "المفقودات والأمانات" },
  { key: "laundry", label: "المغسلة" },
  { key: "events", label: "القاعات والمناسبات" },
  { key: "surveys", label: "تقييم النزلاء" },
  { key: "hr", label: "الموارد البشرية" },
  { key: "inventory", label: "المخزون" },
  { key: "assets", label: "الأصول الثابتة" },
  { key: "assistant", label: "المساعد الذكي" },
] as const;

export type SectionKey = (typeof SECTIONS)[number]["key"];
export const SECTION_KEYS: readonly string[] = SECTIONS.map((s) => s.key);
export const sectionLabel = (k: string) => SECTIONS.find((s) => s.key === k)?.label ?? k;
