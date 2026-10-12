import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { catalogFor, getHotel } from "@/lib/data";
import { STATIC_CATALOG } from "@/lib/catalog";
import { ago, day, hotelState } from "@/lib/format";
import { deleteHotelAction, resetActivationAction, saveHotelAction, setStatusAction } from "@/app/actions";
import { ActionForm, ConfirmButton } from "@/components/forms";
import { CodeShare } from "@/components/code-share";
import { SystemControl } from "@/components/system-control";
import { Shell, PageTitle, StatePill } from "@/components/shell";
import { Alert } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const metadata = { title: "الفندق" };

const STEPS = ["أرسل الكود للفندق بواتساب أو انسخه", "الفندق يفتح النظام ويكتب الكود في شاشة التفعيل", "يعمل النظام فورًا بالأقسام التي اخترتها، ويظهر هنا متصلًا"];

export default async function HotelPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const h = await getHotel(id);
  if (!h) notFound();
  const state = hotelState(h);
  const hotelCatalog = await catalogFor(h);
  return (
    <Shell active="/hotels">
      <PageTitle back={{ href: "/hotels", label: "الفنادق" }} title={<span className="flex flex-wrap items-center gap-3">{h.name}<StatePill state={state} /></span>}>
        {h.contact}
      </PageTitle>
      <div className="space-y-6">
        {sp.created && <Alert variant="success">أُضيف الفندق. أرسل له كود الربط بالأسفل.</Alert>}
        {h.status === "suspended" && <Alert variant="destructive">هذا الفندق موقوف: يتوقف نظامه خلال دقيقة، وبياناته محفوظة. يرجع يعمل بإعادة التفعيل من أسفل الصفحة.</Alert>}

        {/* الربط أولًا: هو ما يحتاجه صاحب النظام في أغلب زياراته */}
        <section className="surface p-6">
          <h2 className="mb-5 text-[20px] font-semibold text-ink">ربط نظام الفندق</h2>
          {h.instance ? (
            <div className="space-y-5">
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ["الحالة", <StatePill key="s" state={state} />],
                  ["آخر تواصل", ago(h.instance.last_seen)],
                  ["يعمل", h.instance.mode === "cloud" ? "على الموقع" : "على جهاز"],
                  ["رُبط في", <span key="d" className="num">{day(h.instance.activated_at)}</span>],
                ].map(([k, v]) => (
                  <div key={String(k)} className="rounded-xl bg-subtle/60 p-4"><dt className="text-[14px] text-slate-500">{k}</dt><dd className="mt-1 text-[16.5px] font-medium text-ink">{v}</dd></div>
                ))}
              </dl>
              {h.instance.url && (
                <a href={h.instance.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[15.5px] text-action hover:underline" dir="ltr">
                  {h.instance.url.replace(/^https?:\/\//, "")}<ExternalLink className="size-4" />
                </a>
              )}
              <details className="rounded-xl border border-line p-4">
                <summary className="cursor-pointer text-[15.5px] text-slate-600">نقل الفندق لجهاز أو موقع آخر</summary>
                <div className="mt-3 space-y-3">
                  <p className="text-[15px] leading-relaxed text-slate-600">يتوقف النظام الحالي خلال دقيقة، ويصدر كود ربط جديد تكتبه في الجهاز أو الموقع الجديد.</p>
                  <ConfirmButton label="فصل النظام وإصدار كود جديد" action={resetActivationAction.bind(null, h.id)}
                    confirm="يُفصل النظام الحالي ويحتاج كود الربط الجديد ليعمل. متابعة؟" />
                </div>
              </details>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
              <ol className="space-y-3">
                {STEPS.map((s, i) => (
                  <li key={s} className="flex items-start gap-3 text-[16px] text-slate-700">
                    <span className="num flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-[14px] font-bold text-white">{i + 1}</span>{s}
                  </li>
                ))}
              </ol>
              <CodeShare code={h.code} hotel={h.name} />
            </div>
          )}
        </section>

        <SystemControl hotelId={h.id} sections={h.sections} blocked={h.blocked ?? []} blockedPermissions={h.blocked_permissions ?? []}
          catalog={hotelCatalog ?? STATIC_CATALOG} fromHotel={!!hotelCatalog} />

        <ActionForm action={saveHotelAction} submit="حفظ البيانات" className="surface space-y-4 p-6">
          <input type="hidden" name="id" value={h.id} />
          <section className="space-y-4">
            <h2 className="text-[18px] font-semibold text-ink">بيانات الفندق</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="name">اسم الفندق</Label><Input id="name" name="name" defaultValue={h.name} required /></div>
              <div className="space-y-1.5"><Label htmlFor="contact">صاحب الفندق وجواله</Label><Input id="contact" name="contact" defaultValue={h.contact} /></div>
            </div>
            <div className="space-y-1.5"><Label htmlFor="notes">ملاحظات لك</Label><Textarea id="notes" name="notes" defaultValue={h.notes} placeholder="السعر، تاريخ البيع، أي تفاصيل" /></div>
          </section>
        </ActionForm>

        <section className="surface grid gap-6 p-6 md:grid-cols-2">
          <div className="space-y-2">
            <h2 className="text-[18px] font-semibold text-ink">{h.status === "active" ? "إيقاف الفندق" : "إعادة التفعيل"}</h2>
            <p className="text-[15px] leading-relaxed text-slate-600">{h.status === "active"
              ? "يتوقف نظام الفندق خلال دقيقة، وتبقى بياناته محفوظة. تقدر ترجعه متى شئت."
              : "يرجع نظام الفندق يعمل خلال دقيقة بنفس بياناته."}</p>
            {h.status === "active"
              ? <ConfirmButton variant="destructive" label="إيقاف الفندق" action={setStatusAction.bind(null, h.id, "suspended")} confirm={`إيقاف ${h.name}؟ يتوقف نظامه خلال دقيقة.`} />
              : <ConfirmButton variant="default" label="إعادة التفعيل" action={setStatusAction.bind(null, h.id, "active")} />}
          </div>
          <div className="space-y-2 md:border-s md:border-line md:ps-6">
            <h2 className="text-[18px] font-semibold text-ink">حذف من اللوحة</h2>
            <p className="text-[15px] leading-relaxed text-slate-600">يُحذف من لوحتك ويتوقف نظامه خلال دقيقة. بيانات الفندق داخل نظامه تبقى محفوظة.</p>
            <ConfirmButton label="حذف" action={deleteHotelAction.bind(null, h.id)} confirm={`حذف ${h.name}؟ يتوقف نظامه خلال دقيقة ولا يعمل إلا بكود ربط جديد.`} />
          </div>
        </section>
      </div>
    </Shell>
  );
}
