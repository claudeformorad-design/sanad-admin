import { createHash } from "node:crypto";
import { z } from "zod";
import data from "./catalog.json";

/**
 * فهرس ما يمكن إيقافه في نظام الفندق: شجرة الأقسام والصفحات والخانات والأزرار، والصلاحيات.
 * المرجع لكل فندق هو فهرس نسخته نفسها: يرسله نظام الفندق عند التواصل (حين لا تعرف اللوحة بصمته)،
 * فتظهر أي صفحة أو صلاحية جديدة في نسخته تلقائيًا. هذا الملف احتياطي لما قبل أول تواصل، ويُولَّد من النظام:
 *   bun scripts/panel-catalog.ts ../sanad-admin/src/lib/catalog.json   (في مستودع النظام)
 */
export type CatalogNode = {
  key: string;
  kind: "section" | "part" | "field" | "button";
  label: string;
  hint?: string;
  /** أساسي لا يُوقف، مع السبب */
  locked?: string;
  permissions?: string[];
  children?: CatalogNode[];
};
export type CatalogPermission = { code: string; group: string; label: string; product: string; locked?: boolean };
export type Catalog = { tree: CatalogNode[]; permission_groups: { key: string; label: string }[]; permissions: CatalogPermission[] };

export const STATIC_CATALOG: Catalog = { tree: data.tree as CatalogNode[], permission_groups: data.permission_groups, permissions: data.permissions as CatalogPermission[] };

const key = z.string().regex(/^[a-z_]+(\.[a-z_]+)*$/).max(80);
const text = z.string().max(400);
const nodeSchema: z.ZodType<CatalogNode> = z.lazy(() => z.object({
  key, kind: z.enum(["section", "part", "field", "button"]), label: text, hint: text.optional(), locked: text.optional(),
  permissions: z.array(key).max(50).optional(), children: z.array(nodeSchema).max(200).optional(),
}));
const catalogSchema = z.object({
  tree: z.array(nodeSchema).min(1).max(100),
  permission_groups: z.array(z.object({ key, label: text })).max(200),
  permissions: z.array(z.object({ code: key, group: key, label: text, product: z.string().max(40), locked: z.boolean().optional() })).max(2000),
});

/** فهرس مرسل من نظام فندق: يُتحقق من شكله وحدوده، ويُحفظ كما أُرسل حتى تتطابق بصمته مع بصمة النظام */
export const isCatalog = (v: unknown): v is Catalog => catalogSchema.safeParse(v).success;
export const catalogHash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");

const walk = (nodes: CatalogNode[], out: CatalogNode[] = []) => {
  for (const n of nodes) { out.push(n); if (n.children) walk(n.children, out); }
  return out;
};
/** ما يُوقف من داخل الأقسام: كل صفحة وخانة وزر غير أساسي، في الفهرس الاحتياطي أو فهرس نسخة الفندق */
const blockableKeys = (c: Catalog) => walk(c.tree).filter((n) => n.kind !== "section" && !n.locked).map((n) => n.key);
const blockablePermissions = (c: Catalog) => c.permissions.filter((p) => !p.locked).map((p) => p.code);

export function cleanBlocked(keys: readonly string[], c: Catalog | null = null): string[] {
  const ok = new Set([...blockableKeys(STATIC_CATALOG), ...(c ? blockableKeys(c) : [])]);
  return [...new Set(keys.filter((k) => ok.has(k)))].sort();
}
export function cleanBlockedPermissions(codes: readonly string[], c: Catalog | null = null): string[] {
  const ok = new Set([...blockablePermissions(STATIC_CATALOG), ...(c ? blockablePermissions(c) : [])]);
  // ما يقفله فهرس نسخة الفندق لا يُوقف حتى لو أتاحه الاحتياطي
  const locked = new Set((c?.permissions ?? []).filter((p) => p.locked).map((p) => p.code));
  return [...new Set(codes.filter((x) => ok.has(x) && !locked.has(x)))].sort();
}
