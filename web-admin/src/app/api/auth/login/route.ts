import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/admin-proxy";

export const dynamic = "force-dynamic";
const noStore = { headers: { "Cache-Control": "no-store" } };

export async function POST(request: NextRequest) {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ mensagem: "Informe usuário e senha." }, { status: 415, ...noStore });
  }
  if (Number(request.headers.get("content-length") || 0) > 2048) {
    return NextResponse.json({ mensagem: "A solicitação excede o tamanho permitido." }, { status: 413, ...noStore });
  }
  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 2048) {
      return NextResponse.json({ mensagem: "A solicitação excede o tamanho permitido." }, { status: 413, ...noStore });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ mensagem: "Informe usuário e senha." }, { status: 400, ...noStore });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ mensagem: "Informe usuário e senha." }, { status: 400, ...noStore });
  }
  const { usuario, senha } = body as Record<string, unknown>;
  if (Object.keys(body).length !== 2 || typeof usuario !== "string" || !/^[a-zA-Z0-9_.-]{3,80}$/.test(usuario)
      || typeof senha !== "string" || [...senha].length < 8 || [...senha].length > 128) {
    return NextResponse.json({ mensagem: "Confira o usuário e a senha informados." }, { status: 400, ...noStore });
  }

  const base = (process.env.ADMIN_API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
  try {
    const upstream = await fetch(`${base}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ usuario, senha }),
      cache: "no-store",
      redirect: "manual",
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok || typeof data.token !== "string" || !/^[a-f0-9]{64}$/.test(data.token)) {
      const status = [401, 429, 503].includes(upstream.status) ? upstream.status : 502;
      const message = upstream.status === 401 ? "Usuário ou senha incorretos."
        : upstream.status === 429 ? "Muitas tentativas. Aguarde antes de tentar novamente."
          : upstream.status === 503 ? "O acesso administrativo não está configurado no servidor."
            : "Não foi possível iniciar a sessão.";
      return NextResponse.json({ mensagem: message }, { status, ...noStore });
    }

    const maxAge = Number.isInteger(data.expira_em_segundos) ? Math.max(60, Math.min(data.expira_em_segundos, 1800)) : 1800;
    const response = NextResponse.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(ADMIN_COOKIE, data.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge,
    });
    return response;
  } catch {
    return NextResponse.json({ mensagem: "Não foi possível conectar ao backend administrativo." }, { status: 502, ...noStore });
  }
}
