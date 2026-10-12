import data from "./catalog.json";

/**
 * فهرس ما يمكن إيقافه في نظام الفندق: شجرة الأقسام والصفحات والخانات والأزرار، والصلاحيات.
 * يُولَّد من النظام نفسه (مستودع claude): bun scripts/panel-catalog.ts ../sanad-admin/src/lib/catalog.json
 * فلا يُعدَّل يدويًا، ويُعاد توليده بعد أي إضافة هناك.
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

export const TREE = data.tree as CatalogNode[];
export const PERMISSION_GROUPS = data.permission_groups as { key: string; label: string }[];
export const PERMISSIONS = data.permissions as CatalogPermission[];

const walk = (nodes: CatalogNode[], out: CatalogNode[] = []) => {
  for (const n of nodes) { out.push(n); if (n.children) walk(n.children, out); }
  return out;
};
/** ما يُوقف من داخل الأقسام: كل صفحة وخانة وزر غير أساسي */
export const BLOCKABLE_KEYS: ReadonlySet<string> = new Set(walk(TREE).filter((n) => n.kind !== "section" && !n.locked).map((n) => n.key));
export const BLOCKABLE_PERMISSIONS: ReadonlySet<string> = new Set(PERMISSIONS.filter((p) => !p.locked).map((p) => p.code));

export const cleanBlocked = (keys: readonly string[]) => [...new Set(keys.filter((k) => BLOCKABLE_KEYS.has(k)))].sort();
export const cleanBlockedPermissions = (codes: readonly string[]) => [...new Set(codes.filter((c) => BLOCKABLE_PERMISSIONS.has(c)))].sort();
