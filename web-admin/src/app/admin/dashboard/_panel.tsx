"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import AppMainContainer from "@/themes/components/main";

type MegaSector = { id: number; nome: string };
type Period = { id: number; nome: string; data_inicio: string; data_fim: string };
type Dimension = { codigo: string; nome: string; valor: number; valor_arredondado: number; cor: RiskColor };
type RiskColor = "verde" | "amarelo" | "vermelho";
type Result = {
  status: "disponivel" | "protegido_ou_indisponivel";
  participacoes_validas?: number;
  alertas?: Record<"Q28" | "Q29" | "Q30" | "Q31", boolean>;
  ier?: {
    disponivel: boolean;
    global?: { valor: number; valor_arredondado: number; cor: RiskColor };
    dimensoes?: Dimension[];
  };
};

const alertLabels: Record<"Q28" | "Q29" | "Q30" | "Q31", string> = {
  Q28: "Fofocas, calúnias ou comentários difamatórios intencionais",
  Q29: "Assédio moral continuado, humilhações ou exclusão",
  Q30: "Ameaças verbais ou comportamentos intimidatórios físicos",
  Q31: "Investidas indesejadas com conotação sexual",
};

class RequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function getJson<T>(url: string): Promise<T> {
  let response: Response;
  try { response = await fetch(url, { cache: "no-store" }); }
  catch { throw new RequestError("O servidor não respondeu. Tente novamente.", 0); }
  if (!response.ok) {
    const error = response.status === 401 ? "Sua sessão expirou. Entre novamente para continuar."
      : response.status === 502 ? "Não foi possível conectar ao backend administrativo."
        : "Não foi possível carregar os dados publicados.";
    throw new RequestError(error, response.status);
  }
  return response.json() as Promise<T>;
}

function RiskPill({ color }: { color?: RiskColor }) {
  const label = color ? `Classificação ${color}` : "Classificação indisponível";
  return <span className={`risk-pill ${color ? `risk-${color}` : "risk-neutral"}`} role="img" aria-label={label} title={label}><span className="risk-dot" /></span>;
}

function periodLabel(name: string) {
  return name.replace(/fict[ií]ci[oa]s?/gi, "").replace(/\s{2,}/g, " ").trim();
}

function LoadingState() {
  return <div className="state-card" role="status"><span className="spinner" /><h2>Carregando resultados</h2><p>Consultando os dados agregados publicados para esta seleção.</p></div>;
}

function StateCard({ title, message, action }: { title: string; message: string; action?: ReactNode }) {
  return <div className="state-card"><span className="state-icon" aria-hidden="true">i</span><h2>{title}</h2><p>{message}</p>{action}</div>;
}

export default function DashboardPanel() {
  const router = useRouter();
  const [megaSetores, setMegaSetores] = useState<MegaSector[]>([]);
  const [periodos, setPeriodos] = useState<Period[]>([]);
  const [megaId, setMegaId] = useState("");
  const [periodoId, setPeriodoId] = useState("");
  const [metadataLoading, setMetadataLoading] = useState(true);
  const [resultLoading, setResultLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getJson<MegaSector[]>("/api/admin/mega-setores"), getJson<Period[]>("/api/admin/periodos")])
      .then(([sectors, periods]) => {
        if (!active) return;
        setMegaSetores(sectors);
        setPeriodos(periods);
        setMegaId(sectors[0] ? String(sectors[0].id) : "");
        setPeriodoId(periods[0] ? String(periods[0].id) : "");
      })
      .catch(reason => {
        if (!active) return;
        if (reason instanceof RequestError && reason.status === 401) setSessionExpired(true);
        else setError(reason instanceof Error ? reason.message : "Não foi possível carregar as opções.");
      })
      .finally(() => { if (active) setMetadataLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!megaId || !periodoId || metadataLoading) { setResult(null); return; }
    let active = true;
    setResultLoading(true);
    setResult(null);
    setError(null);
    getJson<Result>(`/api/admin/resultados?mega_setor_id=${encodeURIComponent(megaId)}&periodo_id=${encodeURIComponent(periodoId)}`)
      .then(data => { if (active) setResult(data); })
      .catch(reason => {
        if (!active) return;
        if (reason instanceof RequestError && reason.status === 401) setSessionExpired(true);
        else setError(reason instanceof Error ? reason.message : "Não foi possível carregar os resultados.");
      })
      .finally(() => { if (active) setResultLoading(false); });
    return () => { active = false; };
  }, [megaId, periodoId, metadataLoading]);

  const controls = <div className="filter-panel">
    <label className="filter-field">Setor
      <select value={megaId} onChange={event => setMegaId(event.target.value)} disabled={metadataLoading || megaSetores.length === 0}>
        {megaSetores.map(item => <option key={item.id} value={item.id}>{item.nome}</option>)}
      </select>
    </label>
    <label className="filter-field">Período de coleta
      <select value={periodoId} onChange={event => setPeriodoId(event.target.value)} disabled={metadataLoading || periodos.length === 0}>
        {periodos.map(item => <option key={item.id} value={item.id}>{periodLabel(item.nome)}</option>)}
      </select>
    </label>
  </div>;

  let content: ReactNode;
  if (metadataLoading || resultLoading) content = <LoadingState />;
  else if (sessionExpired) content = <StateCard title="Sessão expirada" message="Entre novamente para consultar os resultados publicados."
    action={<button className="primary-button" onClick={() => router.replace("/")}>Ir para o login</button>} />;
  else if (error) content = <StateCard title="Não foi possível carregar" message={error}
    action={<button className="primary-button" onClick={() => window.location.reload()}>Tentar novamente</button>} />;
  else if (megaSetores.length === 0) content = <StateCard title="Catálogo indisponível" message="O backend ainda não disponibilizou os oito setores." />;
  else if (periodos.length === 0) content = <StateCard title="Nenhum período publicado" message="Os resultados ficam disponíveis após o encerramento e a publicação segura de um período de coleta." />;
  else if (!result || result.status === "protegido_ou_indisponivel") content = <StateCard title="Resultados protegidos ou indisponíveis"
    message="Este grupo tem menos de cinco participações válidas ou ainda não possui uma publicação. Para proteger o anonimato, não são exibidos IER, dimensões, contagem ou alertas." />;
  else if (!result.ier?.disponivel || !result.ier.global || !result.ier.dimensoes) content = <StateCard title="Cálculo indisponível"
    message="Os resultados psicométricos desta publicação não correspondem a uma versão de regras disponível. Nenhum valor de IER ou dimensão será exibido." />;
  else {
    const global = result.ier.global;
    const dimensions = result.ier.dimensoes;
    const setorSelecionado = megaSetores.find(item => String(item.id) === megaId);
    content = <>
      <div className="summary-grid">
        <article className={`summary-card summary-risk-${global.cor}`}>
          <p className="summary-label">Índice de Exposição a Riscos (IER) global</p>
          <div className="ier-value">{global.valor_arredondado.toFixed(1)}<span style={{ fontSize: 22, letterSpacing: 0 }}> / 100</span></div>
        </article>
        <div className="summary-details">
          <article className="detail-card"><p className="summary-label">Participações válidas</p><strong>{result.participacoes_validas}</strong></article>
          <article className="detail-card"><p className="summary-label">Setor</p><strong style={{ fontSize: 14, lineHeight: 1.35, overflowWrap: "break-word" }}>{setorSelecionado?.nome || ""}</strong></article>
          <article className="detail-card"><p className="summary-label">Período</p><strong style={{ fontSize: 15 }}>{periodLabel(periodos.find(item => String(item.id) === periodoId)?.nome || "")}</strong></article>
          <article className="detail-card"><p className="summary-label">Classificação</p><strong style={{ fontSize: 15 }}><RiskPill color={global.cor} /></strong></article>
        </div>
      </div>

      <h2 className="section-title">Resultados das sete dimensões</h2>
      <div className="dimensions-grid">
        {dimensions.map(dimension => <article className="dimension-card" key={dimension.codigo}>
          <div><div className="dimension-name">{dimension.nome}</div><div className="dimension-meter" aria-hidden="true">
            <span className={`meter-${dimension.cor}`} style={{ width: `${Math.max(0, Math.min(100, dimension.valor))}%` }} />
          </div></div>
          <div className="dimension-value"><strong>{dimension.valor_arredondado.toFixed(1)}</strong><span><RiskPill color={dimension.cor} /></span></div>
        </article>)}
      </div>

      <h2 className="section-title">Alertas agregados</h2>
      <div className="alerts-grid">
        {(["Q28", "Q29", "Q30", "Q31"] as const).map(question => {
          const detected = Boolean(result.alertas?.[question]);
          return <article className={`alert-card ${detected ? "detected" : ""}`} key={question}>
            <span className="alert-icon" aria-hidden="true">{detected ? "!" : "✓"}</span>
            <span className="alert-label"><strong>{question}</strong><br />{alertLabels[question]}</span>
            <span className="alert-state">{detected ? "Sinalizado" : "Não sinalizado"}</span>
          </article>;
        })}
      </div>
    </>;
  }

  return <AppMainContainer title="Dashboard" description="Consulte os resultados agregados do Inventário Psicossocial por setor e período de coleta." controls={controls}>{content}</AppMainContainer>;
}
