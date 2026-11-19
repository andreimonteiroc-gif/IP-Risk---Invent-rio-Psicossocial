const rules = require('./scoring-rules.json');
const { alternatives, validateSubmission } = require('./questionnaire');

function validateRules(value) {
    const expected = Array.from({ length: 27 }, (_, i) => i + 1);
    const exactlyOnce = items => Array.isArray(items) && items.length === 27
        && [...items].sort((a, b) => a - b).every((number, i) => number === expected[i]);
    if (typeof value.versao !== 'string' || !value.versao || !value.referencia
        || !exactlyOnce([...value.diretas, ...value.inversas])
        || !exactlyOnce(value.dimensoes.flatMap(dimension => dimension.questoes))
        || value.dimensoes.length !== 7
        || new Set(value.dimensoes.map(dimension => dimension.codigo)).size !== 7
        || value.dimensoes.some(dimension => !dimension.codigo || !dimension.nome || !dimension.questoes.length)
        || JSON.stringify(value.pontuacao_inicial_na_ordem) !== '[100,75,50,25,0]'
        || JSON.stringify(value.excluidas) !== '[28,29,30,31]') {
        throw new Error('Definição de cálculo inconsistente: exige cobertura exata de Q1–Q27.');
    }
    return value;
}
validateRules(rules);

function calculationStatus() {
    return {
        disponivel: true,
        versao_regras: rules.versao,
        referencia: rules.referencia,
        formula_global: rules.ier_global,
        formula_dimensao: rules.ier_dimensao,
        formula_coletiva: rules.ier_coletivo,
        dimensoes: rules.dimensoes.map(dimension => ({ ...dimension, questoes: [...dimension.questoes] })),
        excluidas: [...rules.excluidas],
    };
}

// Núcleo sem pesos: nunca arredonda médias intermediárias.
function meanAdjustedIER(items) {
    if (!Array.isArray(items) || items.length !== 27) throw new Error('Exige Q1–Q27 ajustadas.');
    const seen = new Set();
    const dimensions = new Map();
    let sum = 0;
    for (const { questao, valor, dimensao } of items) {
        if (!Number.isInteger(questao) || questao < 1 || questao > 27 || seen.has(questao)
            || !Number.isFinite(valor) || typeof dimensao !== 'string' || !dimensao.trim()) {
            throw new Error('Questões ajustadas ou dimensões inválidas.');
        }
        seen.add(questao);
        sum += valor;
        const group = dimensions.get(dimensao) || { sum: 0, count: 0 };
        group.sum += valor;
        group.count++;
        dimensions.set(dimensao, group);
    }
    return { global: sum / 27, dimensoes: Object.fromEntries([...dimensions].map(([name, group]) => [name, group.sum / group.count])) };
}

function scoreMap() {
    return rules.dimensoes.flatMap(dimension => dimension.questoes.flatMap(number => alternatives[number - 1].map((alternative, index) => ({
        questao_numero: number, alternativa: alternative, dimensao: dimension.codigo,
        valor: rules.inversas.includes(number) ? 100 - rules.pontuacao_inicial_na_ordem[index] : rules.pontuacao_inicial_na_ordem[index],
    }))));
}

// Uso interno/publicador/testes; nenhum endpoint recebe ou devolve IER individual.
function scoreSubmission(body) {
    if (validateSubmission(body)) throw new Error('Participação inválida para cálculo.');
    const map = scoreMap();
    const items = body.respostas.filter(answer => answer.questao_numero <= 27).map(answer => {
        const item = map.find(entry => entry.questao_numero === answer.questao_numero && entry.alternativa === answer.alternativa);
        return { questao: item.questao_numero, valor: item.valor, dimensao: item.dimensao };
    });
    return meanAdjustedIER(items);
}

function classify(value) {
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error('IER fora do intervalo 0–100.');
    // Metade para cima; corrige apenas o erro binário de representação do Number.
    const rounded = Math.round((value + Number.EPSILON * Math.max(1, Math.abs(value))) * 10) / 10;
    return { valor: value, valor_arredondado: rounded,
        cor: rounded <= 33.3 ? 'verde' : rounded <= 66.6 ? 'amarelo' : 'vermelho' };
}

function formatCollectiveIER(raw) {
    if (!raw || raw.versao_regras !== rules.versao) return { disponivel: false, codigo: 'VERSAO_REGRAS_INDISPONIVEL' };
    if (!raw.dimensoes || Object.keys(raw.dimensoes).length !== 7) return { disponivel: false, codigo: 'CALCULO_INDISPONIVEL' };
    try {
        return { disponivel: true, versao_regras: rules.versao, global: classify(raw.global),
            dimensoes: rules.dimensoes.map(dimension => ({ codigo: dimension.codigo, nome: dimension.nome,
                ...classify(raw.dimensoes[dimension.codigo]) })) };
    } catch { return { disponivel: false, codigo: 'CALCULO_INDISPONIVEL' }; }
}

module.exports = { calculationStatus, meanAdjustedIER, rules, validateRules, scoreMap, scoreSubmission, classify, formatCollectiveIER };
