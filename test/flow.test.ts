import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

process.env.LOCAL_DATA_DIR = mkdtempSync(path.join(tmpdir(), "nazeel-admin-"));

const { createHotel, createNotice, updateHotel, getHotel } = await import("@/lib/data");
const { signingKeys } = await import("@/lib/license");
const { verifyWith } = await import("@/lib/crypto");
const activateRoute = await import("@/app/api/v1/activate/route");
const checkinRoute = await import("@/app/api/v1/checkin/route");

const post = (url: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://panel${url}`, { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "content-type": "application/json", ...headers } });

const decode = (license: string) => {
  const [body, sig] = license.split(".");
  return { body: body!, sig: sig!, payload: JSON.parse(Buffer.from(body!, "base64url").toString()) };
};

const signed = (secret: string, id: string, body: unknown, ts = String(Date.now())) => {
  const raw = JSON.stringify(body);
  return post("/api/v1/checkin", raw, { "x-instance-id": id, "x-timestamp": ts, "x-signature": createHmac("sha256", secret).update(`${ts}.${raw}`).digest("base64url") });
};

describe("panel flow", () => {
  let publicKey = "";
  beforeAll(async () => { publicKey = (await signingKeys()).publicKey; });

  it("activates once with the code and returns a license signed by the panel", async () => {
    const h = await createHotel({ name: "فندق السلام", contact: "أحمد", sections: ["pms", "accounting", "laundry", "bogus"], notes: "" });
    expect(h.sections).toEqual(["pms", "accounting", "laundry"]);
    const res = await activateRoute.POST(post("/api/v1/activate", { code: h.code.toLowerCase(), mode: "cloud", url: "https://salam.example", version: "1.0" }));
    expect(res.status).toBe(200);
    const j = await res.json();
    const { body, sig, payload } = decode(j.license);
    expect(verifyWith(publicKey, body, sig)).toBe(true);
    expect(payload).toMatchObject({ kind: "nazeel-license", hotel_id: h.id, sections: ["pms", "accounting", "laundry"], status: "active", updates: "forever", instance_id: j.instance_id });
    // تزوير الأقسام يكسر التوقيع
    const forged = Buffer.from(JSON.stringify({ ...payload, sections: ["pms", "accounting", "laundry", "hr"] })).toString("base64url");
    expect(verifyWith(publicKey, forged, sig)).toBe(false);
    const again = await activateRoute.POST(post("/api/v1/activate", { code: h.code, mode: "cloud" }));
    expect(again.status).toBe(409);
    expect((await again.json()).error).toBe("already_linked");
    expect(await activateRoute.POST(post("/api/v1/activate", { code: "NZL-XXXX-XXXX", mode: "cloud" })).then((r) => r.status)).toBe(404);

    // التواصل الدوري: التوقيع الصحيح يأخذ الترخيص الحالي والإشعارات
    await updateHotel(h.id, { sections: ["pms", "accounting"] });
    await createNotice({ title: "تحديث", body: "نسخة جديدة", level: "info", target: "all", starts_at: new Date(Date.now() - 1000).toISOString(), ends_at: null });
    await createNotice({ title: "لغيره", body: "x", level: "info", target: ["00000000-0000-4000-8000-000000000000"], starts_at: new Date(Date.now() - 1000).toISOString(), ends_at: null });
    await createNotice({ title: "منتهٍ", body: "x", level: "info", target: "all", starts_at: new Date(Date.now() - 9000).toISOString(), ends_at: new Date(Date.now() - 1000).toISOString() });
    const ok = await checkinRoute.POST(signed(j.secret, j.instance_id, { version: "1.1" }));
    expect(ok.status).toBe(200);
    const c = await ok.json();
    expect(decode(c.license).payload.sections).toEqual(["pms", "accounting"]);
    expect(c.notices.map((n: { title: string }) => n.title)).toEqual(["تحديث"]);
    expect(c.notices[0]).not.toHaveProperty("target");
    expect((await getHotel(h.id))!.instance!.version).toBe("1.1");

    // توقيع خاطئ، أو طلب قديم، يُرفض
    expect((await checkinRoute.POST(signed("wrong-secret", j.instance_id, {}))).status).toBe(401);
    expect((await checkinRoute.POST(signed(j.secret, j.instance_id, {}, String(Date.now() - 20 * 60_000)))).status).toBe(401);

    // الإيقاف يصل في الترخيص
    await updateHotel(h.id, { status: "suspended" });
    const s = await (await checkinRoute.POST(signed(j.secret, j.instance_id, {}))).json();
    expect(decode(s.license).payload.status).toBe("suspended");
  });

  it("a suspended hotel cannot be activated", async () => {
    const h = await createHotel({ name: "موقوف", contact: "", sections: ["pms"], notes: "" });
    await updateHotel(h.id, { status: "suspended" });
    const r = await activateRoute.POST(post("/api/v1/activate", { code: h.code, mode: "installer", machine: "AAAA-BBBB" }));
    expect(r.status).toBe(409);
    expect((await r.json()).error).toBe("suspended");
  });
});
