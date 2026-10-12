"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Lock, Search, ShieldCheck, LayoutGrid, Undo2 } from "lucide-react";
import { saveControlAction } from "@/app/actions";
import type { Catalog, CatalogNode, CatalogPermission } from "@/lib/catalog";
import { META } from "@/components/sections-picker";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const KIND: Record<CatalogNode["kind"], string> = { section: "قسم", part: "صفحة", field: "خانة", button: "زر" };
/** الأقسام الأساسية: لا بد من واحد منها على الأقل */
const CORE = new Set(["pms", "accounting"]);
/** «عام» ليس قسمًا يُباع: موجود دائمًا وتُوقف تفاصيله فقط */
const ALWAYS = "general";

type Props = {
  hotelId: string;
  sections: string[];
  blocked: string[];
  blockedPermissions: string[];
  /** فهرس نسخة الفندق (أو الاحتياطي قبل أول تواصل) */
  catalog: Catalog;
  /** هل الفهرس من نسخة الفندق نفسها */
  fromHotel: boolean;
};

const norm = (s: string) => s.replace(/[ً-ْـ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي").toLowerCase();
const hit = (q: string, ...texts: (string | undefined)[]) => !q || texts.some((t) => t && norm(t).includes(q));
const descendants = (n: CatalogNode): CatalogNode[] => (n.children ?? []).flatMap((c) => [c, ...descendants(c)]);
const sameSet = (a: Set<string>, b: readonly string[]) => a.size === b.length && b.every((x) => a.has(x));

/**
 * التحكم الدقيق في نظام الفندق: الأقسام المشتراة، وكل صفحة وخانة وزر داخلها، وصلاحيات الموظفين.
 * ما يُوقف هنا يُطفأ في نظام الفندق خلال نصف دقيقة، ولا يستطيع مدير الفندق تشغيله من عنده.
 */
export function SystemControl({ hotelId, sections: initialSections, blocked: initialBlocked, blockedPermissions: initialPerms, catalog, fromHotel }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"sections" | "permissions">("sections");
  const [sections, setSections] = useState(() => new Set(initialSections));
  const [blocked, setBlocked] = useState(() => new Set(initialBlocked));
  const [perms, setPerms] = useState(() => new Set(initialPerms));
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const q = norm(query.trim());

  const dirty = !sameSet(sections, initialSections) || !sameSet(blocked, initialBlocked) || !sameSet(perms, initialPerms);
  const flip = (set: Set<string>, key: string, on: boolean) => { const n = new Set(set); if (on) n.add(key); else n.delete(key); return n; };
  const toggleOpen = (k: string) => setOpen((s) => flip(s, k, !s.has(k)));

  const reset = () => { setSections(new Set(initialSections)); setBlocked(new Set(initialBlocked)); setPerms(new Set(initialPerms)); setMsg(null); };
  const save = () => start(async () => {
    setMsg(null);
    const r = await saveControlAction({ id: hotelId, sections: [...sections], blocked: [...blocked], blocked_permissions: [...perms] });
    if (r.ok) { setMsg({ ok: true, text: "حُفظ. يصل التغيير لنظام الفندق خلال نصف دقيقة." }); router.refresh(); }
    else setMsg({ ok: false, text: r.error });
  });

  const blockedCount = blocked.size;
  const permCount = perms.size;

  return (
    <section className="surface overflow-hidden" data-testid="system-control">
      <header className="space-y-4 border-b border-line p-5 sm:p-6">
        <div className="space-y-1">
          <h2 className="text-[20px] font-semibold text-ink">التحكم في نظام الفندق</h2>
          <p className="text-[15px] leading-relaxed text-slate-600">
            اختر الأقسام المشتراة، وأوقف أي صفحة أو خانة أو زر داخلها، وأي صلاحية لكل الموظفين حتى المدير.
            ما توقفه هنا يظهر عند الفندق مقفلًا ولا يشغّله أحد غيرك.
          </p>
          <p className="text-[13.5px] text-slate-500" data-testid="catalog-source">
            {fromHotel ? "القائمة من نسخة نظام الفندق نفسها، وتتحدث تلقائيًا مع كل تحديث للنظام." : "القائمة العامة، وتتحدث من نسخة نظام الفندق نفسها بعد أول تواصل له."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div role="tablist" className="inline-flex rounded-lg bg-subtle p-1">
            {([
              ["sections", "الأقسام وتفاصيلها", LayoutGrid, blockedCount],
              ["permissions", "الصلاحيات", ShieldCheck, permCount],
            ] as const).map(([key, label, Icon, n]) => (
              <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
                className={cn("flex items-center gap-2 rounded-md px-3.5 py-2 text-[15.5px] transition-colors",
                  tab === key ? "bg-white font-medium text-ink shadow-sm" : "text-slate-600 hover:text-ink")}>
                <Icon className="size-4" />{label}
                {n > 0 && <span className="num rounded-full bg-urgent-tint px-1.5 text-[12.5px] text-urgent">{n}</span>}
              </button>
            ))}
          </div>
          <label className="relative min-w-0 flex-1 basis-56">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tab === "sections" ? "ابحث عن صفحة أو خانة أو زر" : "ابحث عن صلاحية"}
              className="h-10 w-full rounded-lg border border-line-strong bg-white ps-9 pe-3 text-[15.5px] outline-none focus:border-action" />
          </label>
        </div>
      </header>

      <div className="p-4 sm:p-6">
        {tab === "sections" ? (
          <SectionsTab tree={catalog.tree} {...{ sections, setSections, blocked, setBlocked, open, toggleOpen, q }} />
        ) : (
          <PermissionsTab groups0={catalog.permission_groups} all={catalog.permissions} {...{ perms, setPerms, q }} />
        )}
      </div>

      <footer className={cn("sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-line bg-white/95 px-5 py-3 backdrop-blur sm:px-6",
        !dirty && !msg && "hidden")}>
        {msg ? <Alert variant={msg.ok ? "success" : "destructive"} className="flex-1 py-2">{msg.text}</Alert>
          : <p className="flex-1 text-[15px] text-slate-600">عندك تغييرات لم تُحفظ</p>}
        {dirty && <Button type="button" variant="ghost" size="sm" onClick={reset} disabled={pending}><Undo2 />تراجع</Button>}
        {dirty && <Button type="button" onClick={save} loading={pending} data-testid="control-save">حفظ التغييرات</Button>}
      </footer>
    </section>
  );
}

function SectionsTab({ tree, sections, setSections, blocked, setBlocked, open, toggleOpen, q }: {
  tree: CatalogNode[];
  sections: Set<string>; setSections: (s: Set<string>) => void;
  blocked: Set<string>; setBlocked: (s: Set<string>) => void;
  open: Set<string>; toggleOpen: (k: string) => void; q: string;
}) {
  const sold = (k: string) => k === ALWAYS || sections.has(k);
  const setSold = (k: string, on: boolean) => {
    const n = new Set(sections);
    if (on) n.add(k); else n.delete(k);
    if (![...n].some((x) => CORE.has(x))) return;
    setSections(n);
  };
  const setNode = (n: CatalogNode, on: boolean) => {
    const next = new Set(blocked);
    if (on) next.delete(n.key); else next.add(n.key);
    setBlocked(next);
  };
  const setAll = (sec: CatalogNode, on: boolean) => {
    const next = new Set(blocked);
    for (const d of descendants(sec)) if (!d.locked) { if (on) next.delete(d.key); else next.add(d.key); }
    setBlocked(next);
  };

  const visible = tree.filter((s) => hit(q, s.label, s.hint) || descendants(s).some((d) => hit(q, d.label, d.hint)));
  const onlyCore = [...sections].filter((x) => CORE.has(x));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 pb-1">
        <Button type="button" variant="outline" size="sm" onClick={() => setSections(new Set(onlyCore.length ? onlyCore : ["pms", "accounting"]))}>الأساسية فقط</Button>
        <Button type="button" variant="outline" size="sm" onClick={() => setSections(new Set(tree.map((s) => s.key).filter((k) => k !== ALWAYS)))}>كل الأقسام</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setBlocked(new Set())} disabled={!blocked.size}>تشغيل كل التفاصيل</Button>
      </div>
      {visible.length === 0 && <p className="py-10 text-center text-[15.5px] text-slate-500">لا نتائج للبحث</p>}
      {visible.map((sec) => {
        const meta = META[sec.key];
        const Icon = meta?.icon;
        const isSold = sold(sec.key);
        const kids = descendants(sec);
        const off = kids.filter((d) => blocked.has(d.key)).length;
        const expanded = (open.has(sec.key) || !!q) && isSold && kids.length > 0;
        return (
          <article key={sec.key} data-section={sec.key}
            className={cn("overflow-hidden rounded-xl border transition-colors", isSold ? "border-line-strong bg-white" : "border-line bg-panel/60")}>
            <div className="flex items-center gap-3 p-4">
              <button type="button" onClick={() => toggleOpen(sec.key)} disabled={!isSold || !kids.length}
                className="flex min-w-0 flex-1 items-center gap-3 text-start disabled:cursor-default" aria-expanded={expanded}>
                {Icon && <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", isSold ? "bg-ink text-white" : "bg-subtle text-slate-500")}><Icon className="size-5" /></span>}
                <span className="min-w-0 flex-1 space-y-0.5">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className={cn("text-[17px] font-semibold", isSold ? "text-ink" : "text-slate-500")}>{sec.label}</span>
                    {CORE.has(sec.key) && <span className="rounded bg-subtle px-1.5 py-0.5 text-[12.5px] text-slate-600">أساسي</span>}
                    {!isSold && <span className="rounded bg-subtle px-1.5 py-0.5 text-[12.5px] text-slate-500">غير مشترى</span>}
                    {isSold && off > 0 && <span className="num rounded bg-urgent-tint px-1.5 py-0.5 text-[12.5px] text-urgent">{off} موقوف</span>}
                  </span>
                  <span className="block text-[14px] leading-snug text-slate-500">{meta?.hint ?? sec.hint}</span>
                  {isSold && kids.length > 0 && (
                    <span className="block text-[13px] text-slate-400"><span className="num">{kids.length}</span> صفحة وخانة وزر تتحكم فيها</span>
                  )}
                </span>
                {isSold && kids.length > 0 && <ChevronDown className={cn("size-5 shrink-0 text-slate-400 transition-transform", expanded && "rotate-180")} />}
              </button>
              {sec.key === ALWAYS
                ? <LockTag text="دائم" reason="أساس النظام، تُوقف تفاصيله فقط" />
                : <Switch on={isSold} label={`${sec.label}: مشترى`} onChange={(v) => setSold(sec.key, v)}
                    disabled={isSold && CORE.has(sec.key) && [...sections].filter((x) => CORE.has(x)).length === 1} />}
            </div>
            {expanded && (
              <div className="border-t border-line bg-panel/40">
                <div className="flex items-center justify-between gap-3 px-4 py-2">
                  <span className="text-[13.5px] text-slate-500">المفعّل يظهر لموظفي الفندق، والموقوف يختفي ويُمنع</span>
                  <span className="flex gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setAll(sec, true)} disabled={!off}>تشغيل الكل</Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setAll(sec, false)}>إيقاف الكل</Button>
                  </span>
                </div>
                <ul className="divide-y divide-line">
                  {(sec.children ?? []).map((c) => <NodeRow key={c.key} node={c} depth={0} parentOff={false} blocked={blocked} onChange={setNode} q={q} />)}
                </ul>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function NodeRow({ node, depth, parentOff, blocked, onChange, q }: {
  node: CatalogNode; depth: number; parentOff: boolean; blocked: Set<string>; onChange: (n: CatalogNode, on: boolean) => void; q: string;
}) {
  const kids = node.children ?? [];
  const selfMatch = hit(q, node.label, node.hint);
  const kidMatch = kids.some((c) => hit(q, c.label, c.hint) || descendants(c).some((d) => hit(q, d.label, d.hint)));
  if (!selfMatch && !kidMatch) return null;
  const off = blocked.has(node.key);
  const effectiveOff = parentOff || off;
  return (
    <>
      <li data-node={node.key} className={cn("flex items-center gap-3 py-3 pe-4", depth === 0 ? "ps-4 sm:ps-16" : "ps-8 sm:ps-24", effectiveOff && "bg-subtle/70")}>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("text-[15.5px]", depth === 0 ? "font-medium" : "", effectiveOff ? "text-slate-500 line-through decoration-slate-300" : "text-ink")}>{node.label}</span>
            <span className="rounded bg-white px-1.5 py-0.5 text-[12px] text-slate-500 ring-1 ring-line">{KIND[node.kind]}</span>
          </div>
          {node.locked ? <p className="text-[13.5px] text-slate-500">{node.locked}</p>
            : parentOff ? <p className="text-[13.5px] text-slate-500">موقوف لأن الصفحة التي يتبعها موقوفة</p>
            : node.hint && <p className="text-[13.5px] text-slate-500">{node.hint}</p>}
        </div>
        {node.locked ? <LockTag text="أساسي" reason={node.locked} />
          : <Switch on={!off} label={node.label} disabled={parentOff} onChange={(v) => onChange(node, v)} />}
      </li>
      {kids.map((c) => <NodeRow key={c.key} node={c} depth={depth + 1} parentOff={effectiveOff} blocked={blocked} onChange={onChange} q={selfMatch ? "" : q} />)}
    </>
  );
}

function PermissionsTab({ groups0, all, perms, setPerms, q }: {
  groups0: Catalog["permission_groups"]; all: CatalogPermission[]; perms: Set<string>; setPerms: (s: Set<string>) => void; q: string;
}) {
  const groups = groups0.map((g) => ({
    ...g,
    items: all.filter((p) => p.group === g.key && (hit(q, p.label, p.code) || hit(q, g.label))),
  })).filter((g) => g.items.length);
  const set = (codes: CatalogPermission[], on: boolean) => {
    const n = new Set(perms);
    for (const p of codes) if (!p.locked) { if (on) n.delete(p.code); else n.add(p.code); }
    setPerms(n);
  };
  return (
    <div className="space-y-4">
      <Alert>الصلاحية الموقوفة تُسحب من كل موظفي الفندق حتى المدير العام، ولا يقدر أحد في الفندق يرجعها. إدارة الفندق والمستخدمين لا تُوقف حتى لا يُقفل النظام على صاحبه.</Alert>
      {groups.length === 0 && <p className="py-10 text-center text-[15.5px] text-slate-500">لا نتائج للبحث</p>}
      <div className="grid gap-4 lg:grid-cols-2">
        {groups.map((g) => {
          const off = g.items.filter((p) => perms.has(p.code)).length;
          return (
            <article key={g.key} data-group={g.key} className="overflow-hidden rounded-xl border border-line-strong bg-white">
              <header className="flex items-center gap-3 border-b border-line bg-panel/60 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[16.5px] font-semibold text-ink">{g.label}</span>
                  <span className="num text-[13.5px] text-slate-500">{off ? `${off} من ${g.items.length} موقوفة` : `${g.items.length} صلاحية، كلها متاحة`}</span>
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={() => set(g.items, off > 0)}>{off > 0 ? "تشغيل الكل" : "إيقاف الكل"}</Button>
              </header>
              <ul className="divide-y divide-line">
                {g.items.map((p) => {
                  const isOff = perms.has(p.code);
                  return (
                    <li key={p.code} data-permission={p.code} className={cn("flex items-center gap-3 px-4 py-2.5", isOff && "bg-subtle/70")}>
                      <span className="min-w-0 flex-1">
                        <span className={cn("block text-[15px] leading-snug", isOff ? "text-slate-500 line-through decoration-slate-300" : "text-ink")}>{p.label}</span>
                      </span>
                      {p.locked ? <LockTag text="لا تُوقف" reason="حتى لا يُقفل النظام على صاحبه" />
                        : <Switch on={!isOff} label={p.label} onChange={(v) => set([p], v)} />}
                    </li>
                  );
                })}
              </ul>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Switch({ on, label, disabled, onChange }: { on: boolean; label: string; disabled?: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={() => onChange(!on)}
      className={cn("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45",
        on ? "bg-success" : "bg-slate-300")}>
      <span className={cn("absolute size-5 rounded-full bg-white shadow-sm transition-[inset-inline-start] duration-200", on ? "start-[22px]" : "start-0.5")} />
    </button>
  );
}

function LockTag({ text, reason }: { text: string; reason: string }) {
  return <span className="flex shrink-0 items-center gap-1 text-[13.5px] text-slate-500" title={reason}><Lock className="size-3.5" />{text}</span>;
}
