import { proxyAdmin } from "@/lib/admin-proxy";

export const dynamic = "force-dynamic";

export function GET() {
  return proxyAdmin("/admin/sessao");
}
