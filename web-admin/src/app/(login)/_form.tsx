"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginForm() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, senha }),
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof data.mensagem === "string" ? data.mensagem : "Não foi possível iniciar a sessão.");
        return;
      }
      setSenha("");
      router.replace("/admin/dashboard");
      router.refresh();
    } catch {
      setError("Não foi possível conectar ao servidor. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <Image src="/ip-risk-logo.png" alt="Logo IP RISK — Inventário Psicossocial" width={190} height={88} className="login-brand-logo" priority />
      <h1>Entrar</h1>
      <p className="login-subtitle">Painel administrativo IP RISK — Inventário Psicossocial</p>
      <div className="field">
        <label htmlFor="usuario">Usuário</label>
        <input id="usuario" name="username" autoComplete="username" required minLength={3} maxLength={80}
          value={usuario} onChange={event => setUsuario(event.target.value)} placeholder="Seu usuário administrativo" />
      </div>
      <div className="field">
        <label htmlFor="senha">Senha</label>
        <input id="senha" name="password" type="password" autoComplete="current-password" required minLength={8} maxLength={128}
          value={senha} onChange={event => setSenha(event.target.value)} placeholder="Sua senha" />
      </div>
      {error && <p role="alert" className="error-banner">{error}</p>}
      <button className="primary-button" type="submit" disabled={submitting}>
        {submitting ? "Verificando…" : "Entrar"}
      </button>
    </form>
  );
}
