"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, Copy } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/app/actions";

/** نموذج يرسل لإجراء خادم ويعرض خطأه أو نجاحه فوق الحقول */
export function ActionForm({ action, children, className, submit }: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  submit: string;
}) {
  const [state, run] = useActionState(action, null);
  return (
    <form action={run} className={className ?? "space-y-4"}>
      {state?.error && <Alert variant="destructive">{state.error}</Alert>}
      {state?.ok && <Alert variant="success">{state.ok}</Alert>}
      {children}
      {state?.key && <KeyBox value={state.key} />}
      <Submit label={submit} />
    </form>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending}>{label}</Button>;
}

export function CopyButton({ value, label = "نسخ" }: { value: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button type="button" variant="outline" size="sm" onClick={async () => { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); }}>
      {done ? <Check /> : <Copy />}{done ? "نُسخ" : label}
    </Button>
  );
}

function KeyBox({ value }: { value: string }) {
  return (
    <div className="space-y-2 rounded-lg border border-line bg-subtle p-4">
      <p className="text-[15px] font-medium text-ink">المفتاح جاهز. أرسله للفندق ليلصقه في شاشة التفعيل:</p>
      <textarea readOnly dir="ltr" value={value} className="field h-28 w-full font-mono text-[12px]" aria-label="المفتاح" />
      <CopyButton value={value} label="نسخ المفتاح" />
    </div>
  );
}

/** زر يستدعي إجراءً بلا حقول، مع تأكيد اختياري */
export function ConfirmButton({ action, label, confirm, variant = "outline" }: {
  action: () => Promise<void>; label: string; confirm?: string; variant?: "outline" | "destructive" | "default";
}) {
  const [pending, setPending] = useState(false);
  return (
    <Button type="button" variant={variant} loading={pending} onClick={async () => {
      if (confirm && !window.confirm(confirm)) return;
      setPending(true);
      try { await action(); } finally { setPending(false); }
    }}>{label}</Button>
  );
}
