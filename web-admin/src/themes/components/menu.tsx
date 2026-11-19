"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function DashboardIcon() {
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.2"/>
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.2"/>
  </svg>;
}

function ExitIcon() {
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M10 4H5.5A1.5 1.5 0 0 0 4 5.5v13A1.5 1.5 0 0 0 5.5 20H10M14 8l4 4-4 4m4-4H9"/>
  </svg>;
}

function UsersIcon() {
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    <circle cx="9" cy="8" r="3.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.2a3.2 3.2 0 0 1 0 6.1M17 14a5.1 5.1 0 0 1 3.5 4.8"/>
  </svg>;
}

export default function AppMenu() {
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [roleLabel, setRoleLabel] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/sessao", { cache: "no-store" })
      .then(async response => response.ok ? response.json() as Promise<{ usuario?: string; papel?: string }> : null)
      .then(session => {
        if (!active) return;
        const isSuperadmin = session?.papel === "gerenciador";
        setCanManageUsers(isSuperadmin);
        setUsername(session?.usuario ?? null);
        if (session?.papel === "gerenciador") setRoleLabel("Superadministrador");
        else if (session?.papel === "profissional_autorizado") setRoleLabel("Médico / Profissional Autorizado");
        else setRoleLabel(null);
      })
      .catch(() => {
        if (!active) return;
        setCanManageUsers(false);
        setRoleLabel(null);
        setUsername(null);
      });
    return () => { active = false; };
  }, []);

  async function logout() {
    if (leaving) return;
    setLeaving(true);
    try { await fetch("/api/auth/logout", { method: "POST", cache: "no-store" }); }
    finally { router.replace("/"); router.refresh(); }
  }

  return (
    <aside className="sidebar">
      <Link className="brand" href="/admin/dashboard" aria-label="Painel de resultados">
        <Image src="/ip-risk-logo.png" alt="Logo IP RISK — Inventário Psicossocial" width={148} height={68} className="brand-logo" priority />
        <span className="brand-name">IP RISK • Painel Web</span>
        {roleLabel && <span className="session-badge">{roleLabel}</span>}
        {username && <span className="session-user">{username}</span>}
      </Link>
      <nav className="nav-list" aria-label="Navegação principal">
        <Link className={`nav-link ${pathname.startsWith("/admin/dashboard") ? "active" : ""}`} href="/admin/dashboard">
          <DashboardIcon /><span className="nav-label">Dashboard</span>
        </Link>
        {canManageUsers && <Link className={`nav-link ${pathname.startsWith("/admin/usuarios") ? "active" : ""}`} href="/admin/usuarios">
          <UsersIcon /><span className="nav-label">Médicos e Acessos</span>
        </Link>}
      </nav>
      <div className="sidebar-spacer" />
      <button className="logout-button" type="button" onClick={logout} disabled={leaving}>
        <ExitIcon /><span className="logout-label">{leaving ? "Saindo…" : "Sair"}</span>
      </button>
    </aside>
  );
}
