import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inventário Psicossocial | Painel",
  description: "Resultados psicossociais agregados por setor e período de coleta.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
