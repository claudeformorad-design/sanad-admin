import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getHotel } from "@/lib/data";
import { ago, day } from "@/lib/format";
import { sectionLabel } from "@/lib/sections";
import { deleteHotelAction, offlineKeyAction, resetActivationAction, saveHotelAction, setStatusAction } from "@/app/actions";
import { ActionForm, ConfirmButton, CopyButton } from "@/components/forms";
import { SectionsPicker } from "@/components/sections-picker";
import { Shell, PageTitle } from "@/components/shell";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const metadata = { title: "الفندق" };

export default async function HotelPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const h = await getHotel(id);
  if (!h) notFound();
  const share = `مرحبًا، هذا كود ربط نظام هوتيلنا لـ ${h.name}:\n${h.code}\nاكتبه في شاشة التفعيل أول مرة تفتح النظام.`;
  return (
    <Shell active="/">
      <PageTitle title={h.name} actions={h.status === "active"
        ? <ConfirmButton variant="destructive" label="إيقاف الفندق" action={setStatusAction.bind(null, h.id, "suspended")}
            confirm="يتوقف نظام الفندق عن العمل في أول تواصل، ولا تُحذف بياناته. متابعة؟" />
        : <ConfirmButton variant="default" label="إعادة التفعيل" action={setStatusAction.bind(null, h.id, "active")} />}>
        {h.contact}
      </PageTitle>
      {sp.created && <Alert variant="success" className="mb-5">أُضيف الفندق. أرسل له كود الربط بالأسفل.</Alert>}
      {h.status === "suspended" && <Alert variant="destructive" className="mb-5">هذا الفندق موقوف: نظامه يتوقف عن العمل في أول تواصل.</Alert>}

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-6">
          <section className="surface p-6">
            <h2 className="mb-4 text-[19px] font-semibold text-ink">البيانات والأقسام</h2>
            <ActionForm action={saveHotelAction} submit="حفظ" className="space-y-5">
              <input type="hidden" name="id" value={h.id} />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="name">اسم الفندق</Label><Input id="name" name="name" defaultValue={h.name} required /></div>
                <div className="space-y-1.5"><Label htmlFor="contact">صاحب الفندق وجواله</Label><Input id="contact" name="contact" defaultValue={h.contact} /></div>
              </div>
              <SectionsPicker selected={h.sections} />
              <div className="space-y-1.5"><Label htmlFor="notes">ملاحظات لك</Label><Textarea id="notes" name="notes" defaultValue={h.notes} /></div>
            </ActionForm>
          </section>

          <section className="surface space-y-4 p-6">
            <div className="space-y-1">
              <h2 className="text-[19px] font-semibold text-ink">مفتاح يدوي لجهاز بلا إنترنت</h2>
              <p className="text-[15.5px] text-slate-600">اطلب من الفندق رقم الجهاز من شاشة التفعيل، واكتبه هنا. المفتاح يعمل على ذلك الجهاز فقط، وبالأقسام المحددة الآن.</p>
            </div>
            <ActionForm action={offlineKeyAction} submit="إصدار المفتاح">
              <input type="hidden" name="id" value={h.id} />
              <div className="space-y-1.5"><Label htmlFor="machine">رقم الجهاز</Label><Input id="machine" name="machine" dir="ltr" placeholder="4F2A-9C1D-77B0-E3A5" required /></div>
            </ActionForm>
          </section>
        </div>

        <div className="space-y-6">
          <section className="surface space-y-4 p-6">
            <h2 className="text-[19px] font-semibold text-ink">الربط</h2>
            {h.instance ? (
              <dl className="space-y-2 text-[15.5px]">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">النظام</dt><dd className="text-ink">{h.instance.mode === "cloud" ? "على الموقع" : "على جهاز"}</dd></div>
                {h.instance.url && <div className="flex justify-between gap-3"><dt className="text-slate-500">العنوان</dt><dd className="truncate text-ink" dir="ltr">{h.instance.url}</dd></div>}
                {h.instance.machine && <div className="flex justify-between gap-3"><dt className="text-slate-500">الجهاز</dt><dd className="num text-ink" dir="ltr">{h.instance.machine}</dd></div>}
                <div className="flex justify-between gap-3"><dt className="text-slate-500">النسخة</dt><dd className="num text-ink">{h.instance.version ?? ""}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">رُبط في</dt><dd className="num text-ink">{day(h.instance.activated_at)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">آخر تواصل</dt><dd className="text-ink">{ago(h.instance.last_seen)}</dd></div>
              </dl>
            ) : (
              <div className="space-y-3">
                <p className="text-[15.5px] text-slate-600">لم يُربط بعد. أعطِ الفندق هذا الكود ليكتبه أول مرة يفتح النظام:</p>
                <p className="num rounded-lg bg-subtle px-4 py-3 text-center text-[24px] font-bold tracking-wider text-ink" dir="ltr">{h.code}</p>
                <div className="flex flex-wrap gap-2">
                  <CopyButton value={h.code} label="نسخ الكود" />
                  <Button asChild variant="outline" size="sm"><a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer"><MessageCircle />إرسال بواتساب</a></Button>
                </div>
              </div>
            )}
            {h.instance && (
              <ConfirmButton label="فصل النظام وإصدار كود جديد" action={resetActivationAction.bind(null, h.id)}
                confirm="يُفصل النظام الحالي ويحتاج كود الربط الجديد ليعمل. استخدمها عند تغيير الجهاز أو إعادة النشر. متابعة؟" />
            )}
          </section>

          <section className="surface space-y-3 p-6">
            <h2 className="text-[19px] font-semibold text-ink">المشمول الآن</h2>
            <div className="flex flex-wrap gap-2">{h.sections.map((s) => <Badge key={s} variant="outline">{sectionLabel(s)}</Badge>)}</div>
            <p className="text-[14.5px] text-slate-500">التحديثات مجانية للأبد.</p>
          </section>

          <section className="surface space-y-3 p-6">
            <h2 className="text-[19px] font-semibold text-ink">حذف الفندق من اللوحة</h2>
            <p className="text-[15px] text-slate-600">يُحذف من قائمتك فقط. نظام الفندق المربوط يتوقف عن أخذ التحديثات من اللوحة، ولا تُحذف بياناته.</p>
            <ConfirmButton variant="destructive" label="حذف" action={deleteHotelAction.bind(null, h.id)} confirm={`حذف ${h.name} من اللوحة؟`} />
          </section>
        </div>
      </div>
    </Shell>
  );
}
