import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listHotels } from "@/lib/data";
import { ago, hotelState } from "@/lib/format";
import { EmptyHotels, HotelList } from "@/components/hotel-list";
import { Shell, PageTitle } from "@/components/shell";
import { Button } from "@/components/ui/button";

export const metadata = { title: "الفنادق" };

export default async function HotelsPage() {
  await requireAdmin();
  const hotels = (await listHotels()).sort((a, b) => b.created_at.localeCompare(a.created_at));
  return (
    <Shell active="/hotels">
      <PageTitle title="الفنادق" actions={<Button asChild><Link href="/hotels/new"><Plus />فندق جديد</Link></Button>}>
        كل فندق بعته: أقسامه، وحالة نظامه، وآخر مرة تواصل مع لوحتك.
      </PageTitle>
      {hotels.length === 0
        ? <EmptyHotels />
        : <HotelList hotels={hotels.map((h) => ({
            id: h.id, name: h.name, contact: h.contact, state: hotelState(h), sections: h.sections,
            seen: h.instance ? ago(h.instance.last_seen) : "", where: h.instance ? (h.instance.mode === "cloud" ? "على الموقع" : "على جهاز") : null,
          }))} />}
    </Shell>
  );
}
