import { SECTIONS } from "@/lib/sections";

/** اختيار الأقسام المباعة للفندق */
export function SectionsPicker({ selected }: { selected: readonly string[] }) {
  return (
    <fieldset className="space-y-2">
      <legend className="mb-2 text-[16px] font-medium text-ink">الأقسام المشتراة</legend>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => (
          <label key={s.key} className="flex cursor-pointer items-center gap-3 rounded-lg border border-line bg-white px-3 py-2.5 text-[16px] has-[:checked]:border-ink has-[:checked]:bg-panel">
            <input type="checkbox" name="sections" value={s.key} defaultChecked={selected.includes(s.key)} className="size-4" />
            <span className="text-ink">{s.label}</span>
            {"core" in s && <span className="ms-auto text-[13px] text-slate-500">أساسي</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
