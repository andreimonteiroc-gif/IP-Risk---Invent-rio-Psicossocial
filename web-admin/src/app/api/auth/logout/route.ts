import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-proxy";

export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE)?.value;
  if (token) {
    const base = (process.env.ADMIN_API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
    try {
      await fetch(`${base}/admin/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        redirect: "manual",
      });
    } catch { /* The local cookie still gets cleared if the backend is offline. */ }
  }
  const response = NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.delete(ADMIN_COOKIE);
  return response;
}
