import { NextResponse } from "next/server";
import { z } from "zod";
import { activate, noticesFor } from "@/lib/data";
import { issueLicense } from "@/lib/license";
import { publicNotice } from "@/lib/api";

/**
 * ربط نظام فندق بكود الربط (مرة واحدة). يعيد معرّف النظام وسرّه المشترك وترخيصه الموقّع والإشعارات.
 * السر يُرسل هنا مرة واحدة فقط، ويبقى في مخزن اللوحة الخاص للتحقق من توقيع التواصل الدوري، ولا يظهر في واجهتها.
 */
const body = z.object({
  code: z.string().trim().min(6).max(40),
  mode: z.enum(["cloud", "installer"]),
  machine: z.string().trim().max(200).nullable().optional(),
  url: z.string().trim().max(300).nullable().optional(),
  version: z.string().trim().max(40).nullable().optional(),
});

export async function POST(request: Request) {
  const p = body.safeParse(await request.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "validation" }, { status: 400 });
  const r = await activate(p.data.code, { mode: p.data.mode, machine: p.data.machine ?? null, url: p.data.url ?? null, version: p.data.version ?? null });
  if ("error" in r) return NextResponse.json({ error: r.error }, { status: r.error === "invalid_code" ? 404 : 409 });
  const { hotel, secret } = r;
  const license = await issueLicense(hotel, { instanceId: hotel.instance!.id, machine: hotel.instance!.machine });
  return NextResponse.json({
    instance_id: hotel.instance!.id, secret, license,
    notices: (await noticesFor(hotel.id)).map(publicNotice),
  });
}
