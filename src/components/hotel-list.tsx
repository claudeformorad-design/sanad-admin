"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronLeft, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatePill } from "@/components/shell";
import { STATE_LABEL, type HotelState } from "@/lib/format";
import { cn } from "@/lib/utils";

export type HotelRow = { id: string; name: string; contact: string; state: HotelState; sections: string[]; seen: string; where: string | null };

const FILTERS: (HotelState | "all")[] = ["all", "online", "idle", "waiting", "suspended"];

/** قائمة الفنادق: بحث بالاسم أو صاحب الفندق، وتصفية بالحالة */
export function HotelList({ hotels }: { hotels: HotelRow[] }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<HotelState | "all">("all");
  const count = (s: HotelState | "all") => (s === "all" ? hotels.length : hotels.filter((h) => h.state === s).length);
  const shown = useMemo(() => hotels.filter((h) => (f === "all" || h.state === f)
    && (!q.trim() || `${h.name} ${h.contact}`.toLowerCase().includes(q.trim().toLowerCase()))), [hotels, q, f]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم الفندق أو صاحبه" aria-label="بحث" className="field w-full ps-10" />
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist">
          {FILTERS.map((s) => (
            <button key={s} type="button" role="tab" aria-selected={f === s} onClick={() => setF(s)}
              className={cn("rounded-full px-3 py-1.5 text-[14.5px] transition-colors", f === s ? "bg-ink text-white" : "bg-subtle text-slate-600 hover:text-ink")}>
              {s === "all" ? "الكل" : STATE_LABEL[s]} <span className="num opacity-70">{count(s)}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="surface divide-y divide-line overflow-hidden">
        {shown.length === 0 && <p className="p-8 text-center text-slate-500">لا توجد فنادق بهذا البحث.</p>}
        {shown.map((h) => (
          <Link key={h.id} href={`/hotels/${h.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-panel">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-subtle text-[18px] font-bold text-ink">{h.name.replace(/^\s*(فندق|منتجع|شقق|نزل)\s+/, "").trim().slice(0, 1)}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[17px] font-semibold text-ink">{h.name}</span>
              <span className="block truncate text-[14.5px] text-slate-500">{[h.contact, h.where, `${h.sections.length} أقسام`].filter(Boolean).join("، ")}</span>
            </span>
            <span className="hidden text-end sm:block">
              <StatePill state={h.state} />
              {h.seen && <span className="mt-1 block text-[13.5px] text-slate-500">آخر تواصل {h.seen}</span>}
            </span>
            <span className="sm:hidden"><StatePill state={h.state} /></span>
            <ChevronLeft className="size-5 shrink-0 text-slate-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}

/** لا فنادق بعد: خطوة واحدة واضحة */
export function EmptyHotels() {
  return (
    <div className="surface flex flex-col items-center gap-3 p-12 text-center">
      <p className="text-[20px] font-semibold text-ink">لا توجد فنادق بعد</p>
      <p className="max-w-md text-[16px] leading-relaxed text-slate-600">أضف أول فندق، واختر الأقسام التي اشتراها، ثم أرسل له كود الربط ليكتبه أول مرة يفتح النظام.</p>
      <Button asChild className="mt-2"><Link href="/hotels/new"><Plus />أضف أول فندق</Link></Button>
    </div>
  );
}
