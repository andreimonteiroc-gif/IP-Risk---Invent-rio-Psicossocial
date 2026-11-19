import { NextRequest, NextResponse } from "next/server";
import { proxyAdmin, validId } from "@/lib/admin-proxy";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const keys = [...params.keys()];
  const megaSetor = params.get("mega_setor_id");
  const periodo = params.get("periodo_id");
  if (keys.length !== 2 || keys.filter(key => key === "mega_setor_id").length !== 1
      || keys.filter(key => key === "periodo_id").length !== 1 || !validId(megaSetor) || !validId(periodo)) {
    return NextResponse.json({ codigo: "FILTRO_INVALIDO" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
  return proxyAdmin(`/admin/resultados?mega_setor_id=${megaSetor}&periodo_id=${periodo}`);
}
