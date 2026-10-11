import { requireAdmin } from "@/lib/auth";
import { listHotels, listNotices } from "@/lib/data";
import { day } from "@/lib/format";
import { createNoticeAction, deleteNoticeAction } from "@/app/actions";
import { ActionForm, ConfirmButton } from "@/components/forms";
import { Shell, PageTitle } from "@/components/shell";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const metadata = { title: "الإشعارات" };

export default async function NoticesPage() {
  await requireAdmin();
  const [notices, hotels] = await Promise.all([listNotices(), listHotels()]);
  const name = new Map(hotels.map((h) => [h.id, h.name]));
  const now = new Date().toISOString();
  return (
    <Shell active="/notices">
      <PageTitle title="الإشعارات">إشعار يظهر لمديري الفنادق داخل النظام، مثل تحديث جديد أو موعد صيانة أو تهنئة. يصل في أول تواصل لكل نظام.</PageTitle>
      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <section className="surface p-6">
          <h2 className="mb-4 text-[19px] font-semibold text-ink">إشعار جديد</h2>
          <ActionForm action={createNoticeAction} submit="إرسال">
            <div className="space-y-1.5"><Label htmlFor="title">العنوان</Label><Input id="title" name="title" required /></div>
            <div className="space-y-1.5"><Label htmlFor="body">النص</Label><Textarea id="body" name="body" rows={4} required /></div>
            <fieldset className="space-y-2">
              <legend className="mb-1 text-[16px] font-medium text-ink">الأهمية</legend>
              <label className="flex items-center gap-2 text-[15.5px]"><input type="radio" name="level" value="info" defaultChecked className="size-4" />عادي، يقدر المدير يخفيه</label>
              <label className="flex items-center gap-2 text-[15.5px]"><input type="radio" name="level" value="important" className="size-4" />مهم، يبقى ظاهرًا حتى تنتهي مدته</label>
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="mb-1 text-[16px] font-medium text-ink">يصل إلى</legend>
              <label className="flex items-center gap-2 text-[15.5px]"><input type="radio" name="audience" value="all" defaultChecked className="size-4" />كل الفنادق</label>
              <label className="flex items-center gap-2 text-[15.5px]"><input type="radio" name="audience" value="some" className="size-4" />فنادق محددة</label>
              {hotels.length > 0 && (
                <div className="grid gap-1.5 ps-6">
                  {hotels.map((h) => <label key={h.id} className="flex items-center gap-2 text-[15px]"><input type="checkbox" name="hotels" value={h.id} className="size-4" />{h.name}</label>)}
                </div>
              )}
            </fieldset>
            <div className="space-y-1.5"><Label htmlFor="ends_on">ينتهي في (اختياري)</Label><Input id="ends_on" name="ends_on" type="date" dir="ltr" /></div>
          </ActionForm>
        </section>
        <section className="space-y-3">
          {notices.length === 0 && <p className="surface p-6 text-slate-500">لا توجد إشعارات بعد.</p>}
          {notices.map((n) => {
            const active = !n.ends_at || n.ends_at > now;
            return (
              <article key={n.id} className="surface space-y-2 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[17px] font-semibold text-ink">{n.title}</h3>
                  {n.level === "important" ? <Badge variant="destructive">مهم</Badge> : <Badge>عادي</Badge>}
                  {!active && <Badge variant="secondary">انتهى</Badge>}
                </div>
                <p className="whitespace-pre-line text-[15.5px] leading-relaxed text-slate-700">{n.body}</p>
                <div className="flex flex-wrap items-center justify-between gap-3 text-[14px] text-slate-500">
                  <span>{n.target === "all" ? "كل الفنادق" : n.target.map((id) => name.get(id) ?? "فندق محذوف").join("، ")}
                    {"، أُرسل "}{day(n.created_at)}{n.ends_at ? `، ينتهي ${day(n.ends_at)}` : ""}</span>
                  <ConfirmButton label="حذف" action={deleteNoticeAction.bind(null, n.id)} confirm="حذف الإشعار؟ يختفي من الأنظمة في أول تواصل." />
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </Shell>
  );
}
