import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import AppMenu from "@/themes/components/menu";
import { ADMIN_COOKIE } from "@/lib/admin-proxy";

export const metadata: Metadata = { title: "Painel de resultados | Inventário Psicossocial" };

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const session = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!session) redirect("/");
  return <div className="app-shell"><AppMenu /><div className="app-main">{children}</div></div>;
}
