import type { Notice } from "./data";

/** ما يصل لنظام الفندق من الإشعار (بلا قائمة الفنادق المستهدفة) */
export const publicNotice = (n: Notice) => ({ id: n.id, title: n.title, body: n.body, level: n.level, starts_at: n.starts_at, ends_at: n.ends_at });
