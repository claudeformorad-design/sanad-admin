"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Eye, EyeOff, KeyRound, LockKeyhole } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { passwordChecks, passwordScore } from "@/lib/password";
import { checkSetupCodeAction, setupAction } from "@/app/actions";

const STRENGTH = [
  { label: "ضعيفة جدًا", bar: "bg-urgent" },
  { label: "ضعيفة", bar: "bg-urgent" },
  { label: "متوسطة", bar: "bg-amber" },
  { label: "جيدة", bar: "bg-amber" },
  { label: "قوية", bar: "bg-success" },
];

/** الإعداد الأول بخطوتين: كود الإعداد (لمرة واحدة)، ثم كلمة مرور قوية */
export function SetupWizard() {
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [state, submit] = useActionState(setupAction, null);
  const checks = passwordChecks(password);
  const score = passwordScore(password);
  const strong = checks.every((c) => c.ok);
  const match = confirm.length > 0 && confirm === password;

  return (
    <div className="space-y-6">
      <ol className="flex items-center gap-3" aria-label="الخطوات">
        {[{ n: 1, label: "كود الإعداد", icon: KeyRound }, { n: 2, label: "كلمة المرور", icon: LockKeyhole }].map((s, i) => (
          <li key={s.n} className="flex flex-1 items-center gap-3">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold transition-colors",
              step > s.n ? "bg-success text-white" : step === s.n ? "bg-ink text-white" : "bg-subtle text-slate-500")}>
              {step > s.n ? <Check className="size-4" /> : <s.icon className="size-4" />}
            </span>
            <span className={cn("text-[15px]", step === s.n ? "font-semibold text-ink" : "text-slate-500")}>{s.label}</span>
            {i === 0 && <span className="h-px flex-1 bg-line" />}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          setChecking(true); setCodeError(null);
          const r = await checkSetupCodeAction(code).catch(() => ({ ok: false as const, error: "تعذر التحقق، حاول مرة أخرى" }));
          setChecking(false);
          if (r.ok) setStep(2); else setCodeError(r.error);
        }}>
          <p className="text-[15.5px] leading-relaxed text-slate-600">اكتب كود الإعداد الذي وصلك. يُستخدم مرة واحدة فقط، ولا يُقبل بعد إنشاء كلمة المرور.</p>
          {codeError && <Alert variant="destructive">{codeError}</Alert>}
          <div className="space-y-1.5">
            <Label htmlFor="code">كود الإعداد</Label>
            <Input id="code" dir="ltr" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} autoComplete="one-time-code" autoFocus
              placeholder="XXXX-XXXX-XXXX" className="text-center text-[20px] tracking-[0.2em]" />
          </div>
          <Button type="submit" className="w-full" loading={checking} disabled={code.trim().length < 6}>التالي</Button>
        </form>
      )}

      {step === 2 && (
        <form action={submit} className="space-y-4">
          <input type="hidden" name="code" value={code} />
          {state?.error && <Alert variant="destructive">{state.error}</Alert>}
          <div className="space-y-1.5">
            <Label htmlFor="password">كلمة المرور</Label>
            <div className="relative">
              <Input id="password" name="password" type={show ? "text" : "password"} dir="ltr" autoComplete="new-password" autoFocus
                value={password} onChange={(e) => setPassword(e.target.value)} className="pl-11" />
              <button type="button" onClick={() => setShow(!show)} aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                className="absolute inset-y-0 left-0 flex w-11 items-center justify-center text-slate-500 hover:text-ink">
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2" aria-live="polite">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => <span key={i} className={cn("h-1.5 flex-1 rounded-full transition-colors", i < score ? STRENGTH[score]!.bar : "bg-line")} />)}
            </div>
            <p className="text-[14px] text-slate-600">القوة: <span className="font-semibold text-ink" data-testid="strength">{password ? STRENGTH[score]!.label : ""}</span></p>
            <ul className="grid grid-cols-2 gap-1.5">
              {checks.map((c) => (
                <li key={c.key} className={cn("flex items-center gap-1.5 text-[14px]", c.ok ? "text-success" : "text-slate-500")}>
                  <Check className={cn("size-3.5", !c.ok && "opacity-30")} />{c.label}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm">تأكيد كلمة المرور</Label>
            <Input id="confirm" name="confirm" type={show ? "text" : "password"} dir="ltr" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            {confirm && !match && <p className="text-[14px] text-urgent">غير مطابقة</p>}
          </div>
          <Submit disabled={!strong || !match} />
          <button type="button" className="w-full text-center text-[14.5px] text-slate-500 hover:text-ink" onClick={() => setStep(1)}>رجوع للكود</button>
        </form>
      )}
    </div>
  );
}

function Submit({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return <Button type="submit" className="w-full" loading={pending} disabled={disabled}>إنشاء كلمة المرور والدخول</Button>;
}
