import { redirect } from "next/navigation";
import { isSetUp, isSignedIn } from "@/lib/auth";
import { loginAction } from "@/app/actions";
import { AuthShell } from "@/components/auth/auth-shell";
import { ActionForm } from "@/components/forms";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const dynamic = "force-dynamic";
export const metadata = { title: "الدخول" };

export default async function LoginPage() {
  if (!(await isSetUp())) redirect("/setup");
  if (await isSignedIn()) redirect("/");
  return (
    <AuthShell title="لوحة هوتيلنا" subtitle="ادخل بكلمة مرورك لإدارة فنادقك.">
      <ActionForm action={loginAction} submit="دخول">
        <div className="space-y-1.5"><Label htmlFor="password">كلمة المرور</Label><Input id="password" name="password" type="password" dir="ltr" autoComplete="current-password" autoFocus required /></div>
      </ActionForm>
    </AuthShell>
  );
}
