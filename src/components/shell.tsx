import Link from "next/link";
import { Bell, Building2, LogOut, Settings } from "lucide-react";
import { logoutAction } from "@/app/actions";

const NAV = [
  { href: "/", label: "الفنادق", icon: Building2 },
  { href: "/notices", label: "الإشعارات", icon: Bell },
  { href: "/settings", label: "الإعدادات", icon: Settings },
];

export function Shell({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
          <span className="text-[19px] font-bold text-ink">لوحة نزيل</span>
          <nav className="flex flex-1 items-center gap-1">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-[16px] ${active === n.href ? "bg-subtle font-semibold text-ink" : "text-slate-600 hover:bg-subtle"}`}>
                <n.icon className="size-4" />{n.label}
              </Link>
            ))}
          </nav>
          <form action={logoutAction}>
            <button type="submit" className="flex items-center gap-2 rounded-md px-3 py-2 text-[15px] text-slate-600 hover:bg-subtle"><LogOut className="size-4" />خروج</button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

export function PageTitle({ title, actions, children }: { title: string; actions?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-[28px] font-bold text-ink">{title}</h1>
        {children && <p className="max-w-3xl text-[16px] leading-relaxed text-slate-600">{children}</p>}
      </div>
      {actions}
    </div>
  );
}
