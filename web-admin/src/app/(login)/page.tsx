import type { Metadata } from "next";
import Image from "next/image";
import LoginForm from "./_form";

export const metadata: Metadata = { title: "Entrar | Inventário Psicossocial" };

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-art" aria-label="Ilustração do painel">
        <Image src="/assets/img/logo-login.png" alt="Ilustração de acesso protegido" width={580} height={600} priority />
      </section>
      <section className="login-panel"><LoginForm /></section>
    </main>
  );
}
