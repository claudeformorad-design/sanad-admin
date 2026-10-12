"use client";

import { useState } from "react";
import { BedDouble, Boxes, Building, Calculator, PackageSearch, PartyPopper, Shirt, ShoppingCart, Sparkles, Star, Users, Wrench, type LucideIcon } from "lucide-react";
import { SECTIONS } from "@/lib/sections";
import { cn } from "@/lib/utils";

const META: Record<string, { icon: LucideIcon; hint: string }> = {
  pms: { icon: BedDouble, hint: "الحجوزات والغرف والاستقبال والفوترة" },
  accounting: { icon: Calculator, hint: "القيود والسندات والتقارير المالية" },
  pos: { icon: ShoppingCart, hint: "المطعم والكافيه والبيع المباشر" },
  maintenance: { icon: Wrench, hint: "بلاغات الأعطال وصيانة الغرف" },
  lost_found: { icon: PackageSearch, hint: "المفقودات وأمانات النزلاء" },
  laundry: { icon: Shirt, hint: "طلبات الغسيل والمفروشات" },
  events: { icon: PartyPopper, hint: "حجز القاعات والمناسبات" },
  surveys: { icon: Star, hint: "تقييم النزلاء بعد المغادرة" },
  hr: { icon: Users, hint: "الموظفون والحضور والرواتب" },
  inventory: { icon: Boxes, hint: "الأصناف والمخازن والجرد" },
  assets: { icon: Building, hint: "الأصول الثابتة والإهلاك" },
  assistant: { icon: Sparkles, hint: "مساعد ذكي يجيب من بيانات الفندق" },
};

const CORE: string[] = SECTIONS.filter((s) => "core" in s).map((s) => s.key);
const ALL: string[] = SECTIONS.map((s) => s.key);

/** اختيار الأقسام المشتراة للفندق: بطاقات بأيقونة ووصف، مع اختيار سريع */
export function SectionsPicker({ selected }: { selected: readonly string[] }) {
  const [on, setOn] = useState<Set<string>>(() => new Set(selected));
  const toggle = (k: string) => setOn((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  return (
    <fieldset className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <legend className="text-[18px] font-semibold text-ink">
          الأقسام المشتراة <span className="num ms-1 text-[15px] font-normal text-slate-500">{on.size} من {ALL.length}</span>
        </legend>
        <div className="flex gap-2">
          <button type="button" onClick={() => setOn(new Set(CORE))} className="rounded-md border border-line-strong px-3 py-1.5 text-[14.5px] text-ink hover:bg-subtle">الأساسية فقط</button>
          <button type="button" onClick={() => setOn(new Set(ALL))} className="rounded-md border border-line-strong px-3 py-1.5 text-[14.5px] text-ink hover:bg-subtle">كل الأقسام</button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((s) => {
          const meta = META[s.key];
          const Icon = meta?.icon ?? Sparkles;
          const checked = on.has(s.key);
          return (
            <label key={s.key} className={cn("relative flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors focus-within:ring-2 focus-within:ring-action/40",
              checked ? "border-ink bg-panel" : "border-line bg-white hover:border-line-strong")}>
              <input type="checkbox" name="sections" value={s.key} checked={checked} onChange={() => toggle(s.key)} className="absolute inset-0 cursor-pointer opacity-0" />
              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", checked ? "bg-ink text-white" : "bg-subtle text-slate-600")}>
                <Icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1 space-y-0.5">
                <span className="flex items-center gap-2">
                  <span className="text-[16.5px] font-semibold text-ink">{s.label}</span>
                  {"core" in s && <span className="rounded bg-subtle px-1.5 py-0.5 text-[12.5px] text-slate-600">أساسي</span>}
                </span>
                {meta && <span className="block text-[14px] leading-snug text-slate-500">{meta.hint}</span>}
              </span>
              <span aria-hidden className={cn("mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                checked ? "border-ink bg-ink" : "border-line-strong")}>
                {checked && <span className="size-2 rounded-full bg-white" />}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
