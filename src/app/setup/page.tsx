import { redirect } from "next/navigation";
import { isSetUp } from "@/lib/auth";
import { AuthShell } from "@/components/auth/auth-shell";
import { SetupWizard } from "./setup-wizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "الإعداد الأول" };

/** أول دخول: كود الإعداد لمرة واحدة ثم كلمة مرور قوية */
export default async function SetupPage() {
  if (await isSetUp()) redirect("/login");
  return (
    <AuthShell title="مرحبًا بك في لوحة هوتيلنا" subtitle="من هنا تدير فنادقك وأقسامها وتراخيصها وإشعاراتها. خطوتان وتبدأ.">
      <SetupWizard />
    </AuthShell>
  );
}
