import { requireAdmin } from "@/lib/auth";
import { createHotelAction } from "@/app/actions";
import { ActionForm } from "@/components/forms";
import { SectionsPicker } from "@/components/sections-picker";
import { Shell, PageTitle } from "@/components/shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export const metadata = { title: "فندق جديد" };

export default async function NewHotelPage() {
  await requireAdmin();
  return (
    <Shell active="/">
      <PageTitle title="فندق جديد">بعد الحفظ يظهر كود الربط. أعطه للفندق ليكتبه أول مرة يفتح النظام.</PageTitle>
      <div className="surface p-6">
        <ActionForm action={createHotelAction} submit="حفظ وإصدار كود الربط" className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label htmlFor="name">اسم الفندق</Label><Input id="name" name="name" required /></div>
            <div className="space-y-1.5"><Label htmlFor="contact">صاحب الفندق وجواله</Label><Input id="contact" name="contact" placeholder="مثل: أحمد، 777123456" /></div>
          </div>
          <SectionsPicker selected={["pms", "accounting"]} />
          <div className="space-y-1.5"><Label htmlFor="notes">ملاحظات لك</Label><Textarea id="notes" name="notes" placeholder="السعر، تاريخ البيع، أي تفاصيل" /></div>
        </ActionForm>
      </div>
    </Shell>
  );
}
