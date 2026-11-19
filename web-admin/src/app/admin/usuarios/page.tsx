import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminApiBase } from "@/lib/admin-proxy";
import UsersPanel from "./_panel";

export const dynamic = "force-dynamic";
type AdminUser = { usuario: string; papel: "profissional_autorizado"; nome?: string; ativo?: boolean };

export default async function UsersPage() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!token) redirect("/");
  const headers = { Authorization: `Bearer ${token}` };
  let sessionResponse: Response;
  try {
    sessionResponse = await fetch(`${adminApiBase()}/admin/sessao`, { headers, cache: "no-store" });
  } catch {
    return <UsersPanel initialUsers={[]} initialError="Não foi possível conectar ao backend administrativo." />;
  }
  if (sessionResponse.status === 401) redirect("/");
  if (!sessionResponse.ok) return <UsersPanel initialUsers={[]} initialError="Não foi possível validar sua sessão." />;
  const session = await sessionResponse.json() as { usuario?: string; papel?: string };
  if (session.papel !== "gerenciador") redirect("/admin/dashboard");

  let usersResponse: Response;
  try {
    usersResponse = await fetch(`${adminApiBase()}/admin/usuarios`, { headers, cache: "no-store" });
  } catch {
    return <UsersPanel initialUsers={[]} initialError="Não foi possível conectar ao backend administrativo." />;
  }
  if (usersResponse.status === 401) redirect("/");
  if (usersResponse.status === 403) redirect("/admin/dashboard");
  if (!usersResponse.ok) return <UsersPanel initialUsers={[]} initialError="Não foi possível carregar os usuários. Tente novamente." />;
  const users = await usersResponse.json() as AdminUser[];
  return <UsersPanel initialUsers={users} currentUser={session.usuario} />;
}
