import { requireAdmin } from "@/lib/auth";
import { signingKeys } from "@/lib/license";
import { changePasswordAction } from "@/app/actions";
import { ActionForm, CopyButton } from "@/components/forms";
import { Shell, PageTitle } from "@/components/shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = { title: "الإعدادات" };

export default async function SettingsPage() {
  await requireAdmin();
  const { publicKey } = await signingKeys();
  return (
    <Shell active="/settings">
      <PageTitle title="الإعدادات" />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="surface space-y-4 p-6">
          <h2 className="text-[19px] font-semibold text-ink">تغيير كلمة المرور</h2>
          <ActionForm action={changePasswordAction} submit="تغيير">
            <div className="space-y-1.5"><Label htmlFor="current">الحالية</Label><Input id="current" name="current" type="password" dir="ltr" autoComplete="current-password" required /></div>
            <div className="space-y-1.5"><Label htmlFor="next">الجديدة (10 أحرف على الأقل)</Label><Input id="next" name="next" type="password" dir="ltr" autoComplete="new-password" required /></div>
            <div className="space-y-1.5"><Label htmlFor="confirm">تأكيد الجديدة</Label><Input id="confirm" name="confirm" type="password" dir="ltr" autoComplete="new-password" required /></div>
          </ActionForm>
        </section>
        <section className="surface space-y-3 p-6">
          <h2 className="text-[19px] font-semibold text-ink">مفتاح التحقق العام</h2>
          <p className="text-[15.5px] leading-relaxed text-slate-600">يوضع في كل نظام فندق ليتأكد أن الترخيص صادر من هذه اللوحة. عام وآمن مشاركته، والمفتاح السري الذي يوقّع التراخيص لا يخرج من اللوحة أبدًا.</p>
          <textarea readOnly dir="ltr" value={publicKey} className="field h-20 w-full font-mono text-[12px]" aria-label="المفتاح العام" />
          <CopyButton value={publicKey} label="نسخ المفتاح" />
        </section>
      </div>
    </Shell>
  );
}
