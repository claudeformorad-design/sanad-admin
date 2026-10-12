import Link from "next/link";
import { Bell, Building2, LayoutDashboard, LogOut, Plus, Settings } from "lucide-react";
import { logoutAction } from "@/app/actions";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";
import type { HotelState } from "@/lib/format";
import { STATE_LABEL } from "@/lib/format";

const NAV = [
  { href: "/", label: "الرئيسية", icon: LayoutDashboard },
  { href: "/hotels", label: "الفنادق", icon: Building2 },
  { href: "/notices", label: "الإشعارات", icon: Bell },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

/** إطار اللوحة: قائمة جانبية بهوية النظام، وشريط علوي على الجوال */
export function Shell({ active, children }: { active: string; children: React.ReactNode }) {
  const link = (n: (typeof NAV)[number], compact = false) => (
    <Link key={n.href} href={n.href}
      className={cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-[16px] transition-colors",
        compact && "shrink-0 px-3 py-2 text-[15px]",
        active === n.href ? "bg-white font-semibold text-ink shadow-sm" : "text-slate-600 hover:bg-white/70 hover:text-ink")}>
      <n.icon className="size-[18px]" />{n.label}
    </Link>
  );
  return (
    <div className="min-h-screen bg-content lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-e border-line bg-sidebar p-4 lg:flex">
        <Link href="/" className="mb-6 flex items-center gap-2.5 px-2 pt-1">
          <BrandMark className="size-9" />
          <span className="leading-tight"><span className="block text-[18px] font-bold text-ink">هوتيلنا</span><span className="block text-[13px] text-slate-500">لوحة صاحب النظام</span></span>
        </Link>
        <Link href="/hotels/new" className="mb-4 flex items-center justify-center gap-2 rounded-lg bg-ink px-3 py-2.5 text-[15.5px] font-semibold text-white hover:bg-ink-soft">
          <Plus className="size-[18px]" />فندق جديد
        </Link>
        <nav className="flex flex-1 flex-col gap-1">{NAV.map((n) => link(n))}</nav>
        <form action={logoutAction}>
          <button type="submit" className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[15.5px] text-slate-600 hover:bg-white/70 hover:text-ink">
            <LogOut className="size-[18px]" />تسجيل الخروج
          </button>
        </form>
      </aside>
      <header className="sticky top-0 z-10 border-b border-line bg-sidebar lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2"><BrandMark className="size-8" /><span className="text-[17px] font-bold text-ink">لوحة هوتيلنا</span></Link>
          <form action={logoutAction}><button type="submit" aria-label="تسجيل الخروج" className="rounded-md p-2 text-slate-600 hover:bg-white"><LogOut className="size-5" /></button></form>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2">{NAV.map((n) => link(n, true))}</nav>
      </header>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 lg:py-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

export function PageTitle({ title, actions, children, back }: { title: React.ReactNode; actions?: React.ReactNode; children?: React.ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="mb-8 space-y-3">
      {back && <Link href={back.href} className="inline-flex items-center gap-1 text-[15px] text-slate-500 hover:text-ink">→ {back.label}</Link>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-[30px] font-bold leading-tight text-ink">{title}</h1>
          {children && <div className="max-w-3xl text-[16px] leading-relaxed text-slate-600">{children}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </div>
  );
}

const STATE_STYLE: Record<HotelState, string> = {
  online: "bg-success-tint text-success", idle: "bg-neutral-tint text-neutral",
  waiting: "bg-amber-tint text-amber", suspended: "bg-urgent-tint text-urgent",
};
const DOT: Record<HotelState, string> = { online: "bg-success-dot", idle: "bg-slate-400", waiting: "bg-amber-dot", suspended: "bg-urgent-dot" };

/** حالة الفندق بلون ونقطة: متصل الآن، غير متصل، بانتظار الربط، موقوف */
export function StatePill({ state, className }: { state: HotelState; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[14px] font-medium", STATE_STYLE[state], className)}>
      <span className={cn("size-2 rounded-full", DOT[state], state === "online" && "animate-pulse")} />{STATE_LABEL[state]}
    </span>
  );
}
