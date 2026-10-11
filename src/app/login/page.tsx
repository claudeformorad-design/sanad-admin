import { redirect } from "next/navigation";
import { isSetUp, isSignedIn } from "@/lib/auth";
import { loginAction } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";
export const metadata = { title: "الدخول" };

export default async function LoginPage() {
  if (!(await isSetUp())) redirect("/setup");
  if (await isSignedIn()) redirect("/");
  return (
    <div className="mx-auto mt-24 max-w-md surface space-y-5 p-8">
      <div className="space-y-1">
        <h1 className="text-[24px] font-bold text-ink">لوحة نزيل</h1>
        <p className="text-[16px] text-slate-600">لصاحب النظام فقط.</p>
      </div>
      <ActionForm action={loginAction} submit="دخول">
        <div className="space-y-1.5"><Label htmlFor="password">كلمة المرور</Label><Input id="password" name="password" type="password" dir="ltr" autoComplete="current-password" autoFocus required /></div>
      </ActionForm>
    </div>
  );
}
