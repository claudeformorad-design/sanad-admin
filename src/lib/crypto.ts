import "server-only";
import { createHash, createHmac, createPrivateKey, createPublicKey, generateKeyPairSync, randomBytes, scryptSync, sign, timingSafeEqual, verify } from "node:crypto";

export const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");
export const random = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const hmac = (key: string, data: string) => createHmac("sha256", key).update(data).digest("base64url");

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** كلمة المرور: scrypt بملح عشوائي */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [alg, salt, key] = stored.split("$");
  if (alg !== "scrypt" || !salt || !key) return false;
  const got = scryptSync(password, Buffer.from(salt, "base64url"), 64, { N: 16384, r: 8, p: 1 });
  return safeEqual(got.toString("base64url"), key);
}

/** زوج مفاتيح التوقيع (Ed25519): الخاص يبقى في اللوحة، والعام يُضمَّن في نظام الفندق */
export function newSigningKeys(): { privatePem: string; publicKey: string } {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return {
    privatePem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
    publicKey: publicKey.export({ type: "spki", format: "der" }).toString("base64"),
  };
}

export function signWith(privatePem: string, data: string): string {
  return b64url(sign(null, Buffer.from(data), createPrivateKey(privatePem)));
}

/** للتحقق في الاختبارات: نفس طريقة نظام الفندق */
export function verifyWith(publicKeyB64: string, data: string, signature: string): boolean {
  const key = createPublicKey({ key: Buffer.from(publicKeyB64, "base64"), format: "der", type: "spki" });
  return verify(null, Buffer.from(data), key, Buffer.from(signature, "base64url"));
}

/** كود ربط سهل القراءة والإملاء بالهاتف: بلا حروف متشابهة (0 O 1 I L) */
export function activationCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  const chars = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `NZL-${chars.slice(0, 4)}-${chars.slice(4)}`;
}
