import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ADMIN_COOKIE = "inventario_admin_session";

export function adminApiBase() {
  return (process.env.ADMIN_API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
}

export async function proxyAdmin(path: string, options: { method?: "GET" | "POST" | "PATCH"; body?: string } = {}) {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ codigo: "NAO_AUTORIZADO" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const upstream = await fetch(`${adminApiBase()}${path}`, {
      method: options.method || "GET",
      headers: { Authorization: `Bearer ${token}`, ...(options.body ? { "Content-Type": "application/json" } : {}) },
      ...(options.body ? { body: options.body } : {}),
      cache: "no-store",
      redirect: "manual",
    });
    const data = await upstream.json().catch(() => ({ codigo: "RESPOSTA_INVALIDA" }));
    const response = NextResponse.json(data, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
    if (upstream.status === 401) response.cookies.delete(ADMIN_COOKIE);
    return response;
  } catch {
    return NextResponse.json({ codigo: "BACKEND_INDISPONIVEL" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

export function validId(value: string | null) {
  return value !== null && /^[1-9][0-9]{0,9}$/.test(value) && Number(value) <= 2147483647;
}
