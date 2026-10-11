import { NextResponse } from "next/server";
import { signingKeys } from "@/lib/license";

/** المفتاح العام للتحقق من التراخيص (عام بطبيعته، يُضمَّن في نظام الفندق) */
export async function GET() {
  return NextResponse.json({ public_key: (await signingKeys()).publicKey });
}
