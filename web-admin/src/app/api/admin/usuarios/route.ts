import { NextRequest, NextResponse } from "next/server";
import { proxyAdmin } from "@/lib/admin-proxy";

export const dynamic = "force-dynamic";
const noStore = { headers: { "Cache-Control": "no-store" } };
const usernamePattern = /^[a-zA-Z0-9_.-]{3,80}$/;

export function GET() {
  return proxyAdmin("/admin/usuarios");
}

export async function POST(request: NextRequest) {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ mensagem: "Informe nome de usuário e senha." }, { status: 415, ...noStore });
  }
  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 2048) {
      return NextResponse.json({ mensagem: "A solicitação excede o tamanho permitido." }, { status: 413, ...noStore });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ mensagem: "Informe dados válidos." }, { status: 400, ...noStore });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ mensagem: "Informe dados válidos." }, { status: 400, ...noStore });
  }
  const { usuario, senha, nome, papel } = body as Record<string, unknown>;
  const keys = Object.keys(body);
  if (!keys.every(key => ["usuario", "senha", "nome", "papel"].includes(key))) {
    return NextResponse.json({ mensagem: "Campos inválidos na solicitação de cadastro." }, { status: 400, ...noStore });
  }
  if (papel !== undefined && papel !== "profissional_autorizado") {
    return NextResponse.json({ mensagem: "Não é permitido cadastrar usuários com papel diferente de Médico / Profissional Autorizado." }, { status: 400, ...noStore });
  }
  if (typeof usuario !== "string" || !usernamePattern.test(usuario)) {
    return NextResponse.json({ mensagem: "O usuário deve ter de 3 a 80 caracteres (letras, números, ponto, hífen ou sublinhado)." }, { status: 400, ...noStore });
  }
  if (typeof senha !== "string" || [...senha].length < 8 || [...senha].length > 128) {
    return NextResponse.json({ mensagem: "A senha deve ter de 8 a 128 caracteres." }, { status: 400, ...noStore });
  }
  if (nome !== undefined && (typeof nome !== "string" || nome.trim().length > 100)) {
    return NextResponse.json({ mensagem: "O nome completo deve ter no máximo 100 caracteres." }, { status: 400, ...noStore });
  }
  const payload = typeof nome === "string" && nome.trim()
    ? { usuario, senha, nome: nome.trim() }
    : { usuario, senha };
  return proxyAdmin("/admin/usuarios", { method: "POST", body: JSON.stringify(payload) });
}

export async function PATCH(request: NextRequest) {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return NextResponse.json({ mensagem: "Informe os dados de atualização em JSON." }, { status: 415, ...noStore });
  }
  let body: unknown;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 2048) {
      return NextResponse.json({ mensagem: "A solicitação excede o tamanho permitido." }, { status: 413, ...noStore });
    }
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ mensagem: "Informe dados válidos." }, { status: 400, ...noStore });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ mensagem: "Informe dados válidos." }, { status: 400, ...noStore });
  }
  const keys = Object.keys(body);
  if (!keys.every(key => ["usuario", "ativo", "nome", "novoUsuario", "novaSenha"].includes(key))) {
    return NextResponse.json({ mensagem: "Campos inválidos na solicitação de atualização." }, { status: 400, ...noStore });
  }
  const { usuario, ativo, nome, novoUsuario, novaSenha } = body as Record<string, unknown>;
  if (typeof usuario !== "string" || !usernamePattern.test(usuario)) {
    return NextResponse.json({ mensagem: "Informe o usuário válido." }, { status: 400, ...noStore });
  }
  if (ativo === undefined && nome === undefined && novoUsuario === undefined && novaSenha === undefined) {
    return NextResponse.json({ mensagem: "Informe ao menos um campo para atualizar." }, { status: 400, ...noStore });
  }
  if (ativo !== undefined && typeof ativo !== "boolean") {
    return NextResponse.json({ mensagem: "Informe o status ativo válido." }, { status: 400, ...noStore });
  }
  if (nome !== undefined && (typeof nome !== "string" || nome.trim().length > 100)) {
    return NextResponse.json({ mensagem: "O nome completo deve ter no máximo 100 caracteres." }, { status: 400, ...noStore });
  }
  if (novoUsuario !== undefined && (typeof novoUsuario !== "string" || !usernamePattern.test(novoUsuario))) {
    return NextResponse.json({ mensagem: "O usuário deve ter de 3 a 80 caracteres (letras, números, ponto, hífen ou sublinhado)." }, { status: 400, ...noStore });
  }
  if (novaSenha !== undefined) {
    if (typeof novaSenha !== "string") {
      return NextResponse.json({ mensagem: "A senha deve ter de 8 a 128 caracteres." }, { status: 400, ...noStore });
    }
    if (novaSenha.length > 0 && ([...novaSenha].length < 8 || [...novaSenha].length > 128)) {
      return NextResponse.json({ mensagem: "A senha deve ter de 8 a 128 caracteres." }, { status: 400, ...noStore });
    }
  }
  const payload: Record<string, unknown> = {};
  if (ativo !== undefined) payload.ativo = ativo;
  if (nome !== undefined) payload.nome = (nome as string).trim();
  if (novoUsuario !== undefined) payload.novoUsuario = novoUsuario;
  if (typeof novaSenha === "string" && novaSenha.length > 0) payload.novaSenha = novaSenha;

  return proxyAdmin(`/admin/usuarios/${encodeURIComponent(usuario)}`, { method: "PATCH", body: JSON.stringify(payload) });
}
