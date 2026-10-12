import Link from "next/link";
import { Building2, CircleOff, Hourglass, Plus, Wifi } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listHotels, listNotices } from "@/lib/data";
import { ago, hotelState, type HotelState } from "@/lib/format";
import { EmptyHotels } from "@/components/hotel-list";
import { CodeShare } from "@/components/code-share";
import { Shell, PageTitle, StatePill } from "@/components/shell";
import { Button } from "@/components/ui/button";

export const metadata = { title: "الرئيسية" };

/** الرئيسية: الوضع العام بنظرة، وما يحتاج انتباهك أولًا */
export default async function HomePage() {
  await requireAdmin();
  const [hotels, notices] = await Promise.all([listHotels(), listNotices()]);
  const withState = hotels.map((h) => ({ h, s: hotelState(h) }));
  const by = (s: HotelState) => withState.filter((x) => x.s === s);
  const waiting = by("waiting");
  const suspended = by("suspended");
  const now = new Date().toISOString();
  const activeNotices = notices.filter((n) => !n.ends_at || n.ends_at > now).length;
  const tiles = [
    { label: "الفنادق", value: hotels.length, icon: Building2, href: "/hotels" },
    { label: "متصل الآن", value: by("online").length, icon: Wifi, href: "/hotels" },
    { label: "بانتظار الربط", value: waiting.length, icon: Hourglass, href: "/hotels" },
    { label: "موقوف", value: suspended.length, icon: CircleOff, href: "/hotels" },
  ];
  return (
    <Shell active="/">
      <PageTitle title="أهلًا بك" actions={<Button asChild><Link href="/hotels/new"><Plus />فندق جديد</Link></Button>}>
        {hotels.length ? "هذا وضع فنادقك الآن." : "ابدأ بإضافة أول فندق بعته."}
      </PageTitle>
      {hotels.length === 0 ? <EmptyHotels /> : (
        <div className="space-y-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map((t) => (
              <Link key={t.label} href={t.href} className="surface flex items-center gap-4 p-5 transition-colors hover:bg-panel">
                <span className="flex size-11 items-center justify-center rounded-xl bg-subtle text-ink"><t.icon className="size-5" /></span>
                <span><span className="num block text-[28px] font-bold leading-none text-ink">{t.value}</span><span className="mt-1 block text-[15px] text-slate-600">{t.label}</span></span>
              </Link>
            ))}
          </div>

          {waiting.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-[20px] font-semibold text-ink">بانتظار الربط</h2>
              <p className="text-[15.5px] text-slate-600">أرسل لكل فندق كوده ليكتبه أول مرة يفتح النظام.</p>
              <div className="grid gap-3 lg:grid-cols-2">
                {waiting.map(({ h }) => (
                  <div key={h.id} className="surface space-y-3 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/hotels/${h.id}`} className="text-[17px] font-semibold text-ink hover:underline">{h.name}</Link>
                      <StatePill state="waiting" />
                    </div>
                    <CodeShare code={h.code} hotel={h.name} compact />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-semibold text-ink">آخر الفنادق</h2>
              <Link href="/hotels" className="text-[15px] text-action hover:underline">كل الفنادق</Link>
            </div>
            <div className="surface divide-y divide-line overflow-hidden">
              {withState.sort((a, b) => (b.h.instance?.last_seen ?? b.h.created_at).localeCompare(a.h.instance?.last_seen ?? a.h.created_at)).slice(0, 6).map(({ h, s }) => (
                <Link key={h.id} href={`/hotels/${h.id}`} className="flex items-center gap-4 px-5 py-3.5 hover:bg-panel">
                  <span className="min-w-0 flex-1 truncate text-[16.5px] font-medium text-ink">{h.name}</span>
                  <span className="hidden text-[14px] text-slate-500 sm:inline">{h.instance ? `آخر تواصل ${ago(h.instance.last_seen)}` : ""}</span>
                  <StatePill state={s} />
                </Link>
              ))}
            </div>
          </section>

          <Link href="/notices" className="surface flex items-center justify-between gap-4 p-5 hover:bg-panel">
            <span><span className="block text-[17px] font-semibold text-ink">الإشعارات</span>
              <span className="block text-[15px] text-slate-600">{activeNotices ? `${activeNotices} إشعار ظاهر الآن في أنظمة الفنادق` : "أرسل إشعارًا لكل الفنادق أو لفندق محدد"}</span></span>
            <span className="text-[15px] text-action">فتح</span>
          </Link>
        </div>
      )}
    </Shell>
  );
}
