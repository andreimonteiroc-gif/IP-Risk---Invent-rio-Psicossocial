const STORAGE_KEY = 'ip_risk_completed_period';

/** Fallback em memória quando localStorage/AsyncStorage não está disponível.
 * @type {Map<string, string>} */
const memoryStore = new Map();

/** @returns {Storage | null} */
function getWebStorage() {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

/** Salva localmente apenas o identificador do período concluído e a data, sem dados pessoais.
 * @param {number} periodId
 * @param {string} [completedAt] */
export function saveCompletedPeriod(periodId, completedAt = new Date().toISOString()) {
  if (!Number.isInteger(periodId) || periodId <= 0) return;
  const payload = JSON.stringify({ periodo_id: periodId, concluido_em: completedAt });
  const webStorage = getWebStorage();
  if (webStorage) {
    try {
      webStorage.setItem(STORAGE_KEY, payload);
      return;
    } catch {
      // Ignora falhas de cota/modo privado e mantém fallback em memória.
    }
  }
  memoryStore.set(STORAGE_KEY, payload);
}

/** @returns {{ periodo_id: number, concluido_em: string } | null} */
export function getCompletedPeriod() {
  let raw = null;
  const webStorage = getWebStorage();
  if (webStorage) {
    try {
      raw = webStorage.getItem(STORAGE_KEY);
    } catch {
      raw = null;
    }
  }
  if (!raw) raw = memoryStore.get(STORAGE_KEY) || null;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Number.isInteger(parsed.periodo_id) && typeof parsed.concluido_em === 'string') {
      return { periodo_id: parsed.periodo_id, concluido_em: parsed.concluido_em };
    }
  } catch {
    return null;
  }
  return null;
}

/** @param {number | null | undefined} periodId @returns {boolean} */
export function isPeriodCompleted(periodId) {
  if (!Number.isInteger(periodId) || periodId <= 0) return false;
  return getCompletedPeriod()?.periodo_id === periodId;
}

export function clearCompletedPeriod() {
  const webStorage = getWebStorage();
  if (webStorage) {
    try {
      webStorage.removeItem(STORAGE_KEY);
    } catch {
      // noop
    }
  }
  memoryStore.delete(STORAGE_KEY);
}
