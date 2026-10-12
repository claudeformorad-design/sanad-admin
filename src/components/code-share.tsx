import { MessageCircle } from "lucide-react";
import { CopyButton } from "@/components/forms";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** كود الربط بخط كبير، مع نسخه وإرساله بواتساب برسالة جاهزة */
export function CodeShare({ code, hotel, compact = false }: { code: string; hotel: string; compact?: boolean }) {
  const share = `مرحبًا، هذا كود ربط نظام هوتيلنا لـ ${hotel}:\n${code}\nافتح النظام واكتبه في شاشة التفعيل، مرة واحدة فقط.`;
  return (
    <div className={cn("flex flex-wrap items-center gap-3", !compact && "flex-col items-stretch")}>
      <p className={cn("num rounded-xl bg-subtle font-bold tracking-widest text-ink", compact ? "flex-1 px-4 py-2.5 text-center text-[20px]" : "px-4 py-5 text-center text-[32px]")} dir="ltr">{code}</p>
      <div className={cn("flex gap-2", !compact && "justify-center")}>
        <CopyButton value={code} label="نسخ الكود" />
        <Button asChild variant="outline" size="sm">
          <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener noreferrer"><MessageCircle />واتساب</a>
        </Button>
      </div>
    </div>
  );
}
