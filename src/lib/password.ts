/**
 * سياسة كلمة مرور اللوحة: 10 أحرف على الأقل، وفيها حرف ورقم ورمز.
 * نفس الدالة في الواجهة (مؤشر القوة) والخادم (الرفض)، فلا يختلفان.
 */
export type PasswordCheck = { key: "length" | "letter" | "digit" | "symbol"; label: string; ok: boolean };

export function passwordChecks(p: string): PasswordCheck[] {
  return [
    { key: "length", label: "10 أحرف أو أكثر", ok: p.length >= 10 },
    { key: "letter", label: "حرف", ok: /\p{L}/u.test(p) },
    { key: "digit", label: "رقم", ok: /\p{Nd}/u.test(p) },
    { key: "symbol", label: "رمز مثل ! @ # $", ok: /[^\p{L}\p{Nd}\s]/u.test(p) },
  ];
}

export const strongPassword = (p: string) => passwordChecks(p).every((c) => c.ok);

/** درجة القوة من 0 إلى 4 للمؤشر */
export const passwordScore = (p: string) => passwordChecks(p).filter((c) => c.ok).length;
