import { BrandMark } from "@/components/brand-mark";

/**
 * خلفية شاشات الدخول: داكنة هادئة بتوهّج خفيف، وبطاقة زجاجية في المنتصف.
 * للدخول والإعداد الأول فقط؛ داخل اللوحة يبقى التصميم الفاتح.
 */
export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0f1115] px-4 py-12">
      <div aria-hidden className="pointer-events-none absolute -top-40 start-1/4 size-[520px] rounded-full bg-[#2f6fed]/25 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-48 end-1/5 size-[480px] rounded-full bg-[#18a57a]/20 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#0f1115_75%)]" />
      <div className="relative w-full max-w-[460px]">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <BrandMark light className="size-16 rounded-2xl shadow-lg shadow-black/40" />
          <h1 className="text-[28px] font-bold text-white">{title}</h1>
          <p className="max-w-sm text-[16px] leading-relaxed text-white/65">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-white/15 bg-white/[0.92] p-7 shadow-2xl shadow-black/40 backdrop-blur-xl">{children}</div>
        <p className="mt-6 text-center text-[13.5px] text-white/40">لوحة هوتيلنا لصاحب النظام فقط</p>
      </div>
    </div>
  );
}
