import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listHotels } from "@/lib/data";
import { ago, stale } from "@/lib/format";
import { Shell, PageTitle } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata = { title: "الفنادق" };

export default async function HotelsPage() {
  await requireAdmin();
  const hotels = (await listHotels()).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const linked = hotels.filter((h) => h.instance).length;
  return (
    <Shell active="/">
      <PageTitle title="الفنادق" actions={<Button asChild><Link href="/hotels/new"><Plus />فندق جديد</Link></Button>}>
        {hotels.length ? `${hotels.length} فندق، منها ${linked} مربوط بنظامه.` : "أضف أول فندق، واختر أقسامه، وأعطه كود الربط."}
      </PageTitle>
      {hotels.length > 0 && (
        <div className="surface overflow-hidden">
          <table className="w-full text-[16px]">
            <thead className="bg-subtle text-start text-[14px] text-slate-600">
              <tr><th className="px-4 py-3 text-start font-medium">الفندق</th><th className="px-4 py-3 text-start font-medium">الأقسام</th>
                <th className="px-4 py-3 text-start font-medium">الحالة</th><th className="px-4 py-3 text-start font-medium">النظام</th>
                <th className="px-4 py-3 text-start font-medium">آخر تواصل</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {hotels.map((h) => (
                <tr key={h.id} className="hover:bg-panel">
                  <td className="px-4 py-3"><Link href={`/hotels/${h.id}`} className="font-semibold text-ink hover:underline">{h.name}</Link>
                    {h.contact && <span className="block text-[14px] text-slate-500">{h.contact}</span>}</td>
                  <td className="num px-4 py-3">{h.sections.length}</td>
                  <td className="px-4 py-3">{h.status === "active" ? <Badge variant="success">فعّال</Badge> : <Badge variant="destructive">موقوف</Badge>}</td>
                  <td className="px-4 py-3">{h.instance
                    ? <span>{h.instance.mode === "cloud" ? "على الموقع" : "على جهاز"}{h.instance.version && <span className="num ms-1 text-[14px] text-slate-500">{h.instance.version}</span>}</span>
                    : <Badge variant="warning">بانتظار الربط</Badge>}</td>
                  <td className={`px-4 py-3 ${h.instance && stale(h.instance.last_seen) ? "text-urgent" : "text-slate-600"}`}>{h.instance ? ago(h.instance.last_seen) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Shell>
  );
}
