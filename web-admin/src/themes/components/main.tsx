import React from "react";

export interface AppMainContainerProps {
  title: string;
  description?: string;
  controls?: React.ReactNode;
  children?: React.ReactNode;
}

export default function AppMainContainer({ title, description, controls, children }: AppMainContainerProps) {
  return (
    <main>
      <div className="topbar">
        <span className="topbar-name">Inventário Psicossocial</span>
        <span className="topbar-caption">Painel de consulta agregada</span>
      </div>
      <header className="page-head">
        <div><h1>{title}</h1>{description && <p>{description}</p>}</div>
        {controls}
      </header>
      <section className="content-panel">{children}</section>
    </main>
  );
}
