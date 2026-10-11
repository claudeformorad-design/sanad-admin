import { redirect } from "next/navigation";
import { isSetUp } from "@/lib/auth";
import { setupAction } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";
export const metadata = { title: "الإعداد الأول" };

/** أول دخول: كود الإعداد لمرة واحدة ثم كلمة المرور */
export default async function SetupPage() {
  if (await isSetUp()) redirect("/login");
  return (
    <div className="mx-auto mt-24 max-w-md surface space-y-5 p-8">
      <div className="space-y-1">
        <h1 className="text-[24px] font-bold text-ink">لوحة نزيل</h1>
        <p className="text-[16px] text-slate-600">أول دخول: اكتب كود الإعداد، ثم اختر كلمة مرورك.</p>
      </div>
      <ActionForm action={setupAction} submit="إنشاء كلمة المرور">
        <div className="space-y-1.5"><Label htmlFor="code">كود الإعداد</Label><Input id="code" name="code" dir="ltr" autoComplete="off" required /></div>
        <div className="space-y-1.5"><Label htmlFor="password">كلمة المرور (10 أحرف على الأقل)</Label><Input id="password" name="password" type="password" dir="ltr" autoComplete="new-password" required /></div>
        <div className="space-y-1.5"><Label htmlFor="confirm">تأكيد كلمة المرور</Label><Input id="confirm" name="confirm" type="password" dir="ltr" autoComplete="new-password" required /></div>
      </ActionForm>
    </div>
  );
}
