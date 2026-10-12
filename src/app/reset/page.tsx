import { redirect } from "next/navigation";
import Link from "next/link";
import { isSetUp } from "@/lib/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { SetupWizard } from "../setup/setup-wizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "استعادة كلمة المرور" };

/** نسيت كلمة المرور: كود استعادة لمرة واحدة ثم كلمة مرور جديدة */
export default async function ResetPage() {
  if (!(await isSetUp())) redirect("/setup");
  return (
    <AuthShell title="استعادة كلمة المرور" subtitle="خطوتان وترجع للوحتك. فنادقك وبياناتها لا تتغير.">
      <SetupWizard mode="reset" />
      <Link href="/login" className="mt-4 block text-center text-[15px] text-slate-500 hover:text-ink">رجوع لتسجيل الدخول</Link>
    </AuthShell>
  );
}
