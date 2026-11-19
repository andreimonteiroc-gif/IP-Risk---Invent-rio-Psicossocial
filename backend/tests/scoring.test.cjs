const assert = require('node:assert/strict');
const { test } = require('node:test');
const { rules, validateRules, scoreMap, scoreSubmission, classify, formatCollectiveIER } = require('../scoring');
const { alternatives } = require('../questionnaire');
const { validBody } = require('./helpers.cjs');
const { catalog, validateCatalog } = require('../sector-catalog');

test('27 polaridades exatas, Q12 direta, Q23 inversa e mapa de 135 alternativas', () => {
    assert.deepEqual(rules.diretas, [1, 2, 3, 4, 12, 17, 21, 22, 24, 25, 26]);
    assert.deepEqual(rules.inversas, [5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 18, 19, 20, 23, 27]);
    const map = scoreMap();
    assert.equal(map.length, 135);
    for (let number = 1; number <= 27; number++) {
        const entries = map.filter(entry => entry.questao_numero === number);
        assert.deepEqual(entries.map(entry => entry.alternativa), alternatives[number - 1]);
        assert.deepEqual(entries.map(entry => entry.valor), rules.diretas.includes(number) ? [100, 75, 50, 25, 0] : [0, 25, 50, 75, 100]);
    }
    assert.deepEqual(map.filter(entry => entry.questao_numero === 23).map(entry => [entry.alternativa, entry.valor]),
        [['Excelente', 0], ['Muito boa', 25], ['Boa', 50], ['Regular', 75], ['Ruim', 100]]);
});

test('sete dimensões cobrem cada Q1–Q27 exatamente uma vez e rejeitam duplicação/ausência', () => {
    assert.deepEqual(rules.dimensoes.map(dimension => dimension.questoes), [[1, 2, 3, 4], [5, 6, 7, 8],
        [9, 10, 11, 12, 13, 14, 15, 16], [17], [18, 19, 20], [21, 22], [23, 24, 25, 26, 27]]);
    assert.equal(validateRules(rules), rules);
    const duplicate = structuredClone(rules);
    duplicate.dimensoes[0].questoes[0] = 5;
    assert.throws(() => validateRules(duplicate));
    const missing = structuredClone(rules);
    missing.dimensoes[0].questoes.pop();
    assert.throws(() => validateRules(missing));
    const polarity = structuredClone(rules);
    polarity.diretas.push(5);
    assert.throws(() => validateRules(polarity));
});

async function withScores(score) {
    const body = await validBody();
    const map = scoreMap();
    for (const answer of body.respostas) {
        if (answer.questao_numero <= 27) {
            answer.alternativa = map.find(entry => entry.questao_numero === answer.questao_numero && entry.valor === score(answer.questao_numero)).alternativa;
        }
    }
    return body;
}

test('IER mínimo 0 e máximo 100, inclusive todas as sete dimensões', async () => {
    for (const value of [0, 100]) {
        const body = await withScores(() => value);
        const original = structuredClone(body);
        const score = scoreSubmission(body);
        assert.equal(score.global, value);
        assert.equal(Object.keys(score.dimensoes).length, 7);
        assert.ok(Object.values(score.dimensoes).every(dimension => dimension === value));
        assert.deepEqual(body, original);
    }
});

test('média simples das 27 questões: não usa média das sete dimensões ou pesos', async () => {
    const score = scoreSubmission(await withScores(number => number === 1 ? 100 : 0));
    assert.equal(score.global, 100 / 27);
    assert.equal(score.dimensoes.exigencias_trabalho, 25);
    assert.equal(score.dimensoes.interface_trabalho_familia, 0);
    assert.notEqual(score.global, Object.values(score.dimensoes).reduce((sum, value) => sum + value, 0) / 7);
    const q12 = scoreSubmission(await withScores(number => number === 12 ? 100 : 0));
    assert.equal(q12.global, 100 / 27);
    assert.equal(q12.dimensoes.relacoes_lideranca, 12.5);
});

test('Q28–Q31 não mudam IER e não são pontuadas; entrada incompleta é recusada', async () => {
    const body = await withScores(() => 50);
    const first = scoreSubmission(body);
    for (const answer of body.respostas) if (answer.questao_numero >= 28) answer.alternativa = 'Não';
    assert.deepEqual(scoreSubmission(body), first);
    assert.ok(scoreMap().every(entry => entry.questao_numero <= 27));
    body.respostas.pop();
    assert.throws(() => scoreSubmission(body));
});

test('semáforo arredonda uma casa, metade para cima, e cobre as fronteiras sem lacunas', () => {
    for (const [value, rounded, color] of [[0, 0, 'verde'], [33.3, 33.3, 'verde'], [33.349, 33.3, 'verde'],
        [33.35, 33.4, 'amarelo'], [33.4, 33.4, 'amarelo'], [66.6, 66.6, 'amarelo'], [66.649, 66.6, 'amarelo'],
        [66.65, 66.7, 'vermelho'], [66.7, 66.7, 'vermelho'], [100, 100, 'vermelho']]) {
        assert.deepEqual(classify(value), { valor: value, valor_arredondado: rounded, cor: color });
    }
    for (let i = 0; i <= 10000; i++) assert.ok(['verde', 'amarelo', 'vermelho'].includes(classify(i / 100).cor));
    for (const value of [-0.01, 100.01, NaN, Infinity, null, '50']) assert.throws(() => classify(value));
});

test('resultado coletivo versionado não expõe campos extras e rejeita versão/dados inválidos', () => {
    const raw = { versao_regras: rules.versao, global: 100 / 27,
        dimensoes: Object.fromEntries(rules.dimensoes.map(dimension => [dimension.codigo, 33.35])), participacao_id: 'sigiloso' };
    const result = formatCollectiveIER(raw);
    assert.equal(result.disponivel, true);
    assert.equal(result.global.valor, 100 / 27);
    assert.equal(result.global.valor_arredondado, 3.7);
    assert.equal(result.dimensoes[0].cor, 'amarelo');
    assert.doesNotMatch(JSON.stringify(result), /participacao_id|sigiloso/);
    assert.equal(formatCollectiveIER({ ...raw, versao_regras: 'desconhecida' }).disponivel, false);
    assert.equal(formatCollectiveIER({ ...raw, global: 200 }).disponivel, false);
    assert.equal(formatCollectiveIER({ ...raw, dimensoes: {} }).disponivel, false);
});

test('catálogo transcrito tem oito macroáreas, 33 subdivisões e distribuição fornecida', () => {
    assert.equal(validateCatalog(catalog), catalog);
    assert.deepEqual(catalog.macroareas.map(group => group.subdivisoes.length), [5, 6, 5, 5, 4, 4, 2, 2]);
    assert.equal(catalog.macroareas[1].nome, 'Administrativo e Gestão Corporal (Comum a todas as empresas)');
    const invalid = structuredClone(catalog);
    invalid.macroareas[0].subdivisoes.pop();
    assert.throws(() => validateCatalog(invalid));
});
