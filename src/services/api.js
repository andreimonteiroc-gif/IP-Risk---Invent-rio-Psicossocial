import { NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';

/** @param {unknown} uri @returns {string | null} */
function extractLanIp(uri) {
  if (typeof uri !== 'string' || !uri.trim()) return null;
  const cleaned = uri.trim().replace(/^[a-z][a-z0-9+.-]*:\/\//i, '');
  const host = cleaned.split('/')[0].split(':')[0];
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;
  if (host === '127.0.0.1' || host === '0.0.0.0') return null;
  return host;
}

/** @returns {string} */
function resolveBaseUrl() {
  if (Platform?.OS === 'web') return 'http://localhost:3000';
  const configuredUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configuredUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(configuredUrl)) {
    return configuredUrl;
  }
  const candidates = [
    Constants?.expoConfig?.hostUri,
    /** @type {any} */ (Constants?.manifest2)?.extra?.expoGo?.debuggerHost,
    NativeModules?.SourceCode?.scriptURL,
    Constants?.linkingUri,
  ];
  for (const candidate of candidates) {
    const ip = extractLanIp(candidate);
    if (ip) return `http://${ip}:3000`;
  }
  return configuredUrl || 'http://localhost:3000';
}

/** @typedef {{ id: number, nome: string }} MegaSector */
/** @typedef {{ id: number, nome: string, data_inicio: string, data_fim: string, vigente: boolean }} Period */
/** @typedef {{ mega_setor_id: number, periodo_id: number, respostas: {questao_numero: number, alternativa: string}[] }} Submission */

export class ApiError extends Error {
  /** @param {string} message @param {boolean} [definitive] */
  constructor(message, definitive = false) {
    super(message);
    this.definitive = definitive;
  }
}

/** @param {{baseUrl?: string, fetchImpl?: typeof fetch, timeoutMs?: number}} [options] */
export function createApi({
  baseUrl = resolveBaseUrl(),
  fetchImpl = fetch,
  timeoutMs = 10000,
} = {}) {
  /** @param {string} route @param {RequestInit} [options] */
  async function request(route, options = {}) {
    if (!/^https?:\/\/[^/]+/i.test(baseUrl)) throw new ApiError('Configure o endereço da API de demonstração antes de continuar.', true);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(baseUrl.replace(/\/$/, '') + route, { ...options, signal: controller.signal });
      let data;
      try { data = await response.json(); } catch { throw new ApiError('A API respondeu em formato inválido. Tente novamente.'); }
      if (!response.ok) {
        const definitive = [400, 422, 503].includes(response.status)
          && ['ENTRADA_INVALIDA', 'MEGA_SETOR_INVALIDO', 'PERIODO_INVALIDO', 'COLETA_DESABILITADA', 'CHAVE_INVALIDA'].includes(data?.codigo);
        const messages = /** @type {Record<string, string>} */ ({
          MEGA_SETOR_INVALIDO: 'O setor não está disponível. Volte à seleção e atualize os dados.',
          PERIODO_INVALIDO: 'O período está encerrado ou indisponível. Volte à seleção e atualize os dados.',
          COLETA_DESABILITADA: 'O recebimento de demonstração está desabilitado.',
          CHAVE_REUTILIZADA: 'Não foi possível confirmar esta tentativa. Não inicie outro envio sem verificar a demonstração.',
        });
        throw new ApiError(messages[data?.codigo] || 'O servidor não confirmou o envio. Suas respostas foram preservadas.', definitive);
      }
      return { status: response.status, data };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(`Sem confirmação da API (${baseUrl}). Verifique a conexão e tente novamente; suas respostas foram preservadas.`);
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async loadCatalog() {
      const [health, megaSectors, periods] = await Promise.all([request('/health'), request('/mega-setores'), request('/periodos')]);
      if (health.data?.modo !== 'demonstracao' || health.data?.recebimento_habilitado !== true) {
        throw new ApiError('Disponível somente com o backend de demonstração habilitado.', true);
      }
      /** @param {any} item */
      const validItem = item => Number.isInteger(item?.id) && item.id > 0 && typeof item.nome === 'string' && item.nome.trim().length > 0;
      if (!Array.isArray(megaSectors.data) || megaSectors.data.length !== 8 || !megaSectors.data.every(validItem)
        || new Set(megaSectors.data.map((/** @type {MegaSector} */ item) => item.id)).size !== 8
        || new Set(megaSectors.data.map((/** @type {MegaSector} */ item) => item.nome)).size !== 8
        || !Array.isArray(periods.data) || !periods.data.every(validItem)) {
        throw new ApiError('A API retornou setores ou períodos inválidos.', true);
      }
      const active = periods.data.filter((/** @type {Period} */ period) => period.vigente === true);
      if (active.length === 0) throw new ApiError('Nenhum período vigente disponível para demonstração.', true);
      if (active.length !== 1) throw new ApiError('Há mais de um período vigente. Solicite a configuração da demonstração.', true);
      return { megaSectors: /** @type {MegaSector[]} */ (megaSectors.data), period: /** @type {Period} */ (active[0]) };
    },
    /** @param {Submission} body @param {string} key */
    async submit(body, key) {
      const result = await request('/participacoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: JSON.stringify({ ...body, idempotency_key: key }),
      });
      if (result.status !== 201 || result.data?.status !== 'ok' || result.data?.modo !== 'demonstracao'
        || typeof result.data?.mensagem !== 'string') {
        throw new ApiError('A API não retornou uma confirmação válida. Tente novamente com esta mesma tentativa.');
      }
      return result.data;
    },
  };
}

export const api = createApi();
