// Somente alternativas de entrada. Não atribui escores ou polaridades.
// O teste de contrato compara todas as questões com src/data/questions.js.
const frequency = ['Sempre', 'Frequentemente', 'Às vezes', 'Raramente', 'Nunca'];
const intensity = ['Sempre/Totalmente', 'Frequentemente/Parcialmente', 'Às vezes/Pouco', 'Raramente/Quase nada', 'Nunca/Nada'];
const health = ['Excelente', 'Muito boa', 'Boa', 'Regular', 'Ruim'];
const binary = ['Sim', 'Não'];

const alternatives = Array.from({ length: 31 }, (_, index) => {
    const number = index + 1;
    if (number <= 16) return frequency;
    if (number === 23) return health;
    if (number >= 28) return binary;
    return intensity;
});

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function hasAllowedKeys(value, requiredKeys, optionalKeys = []) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    const allowed = new Set([...requiredKeys, ...optionalKeys]);
    const keys = Object.keys(value);
    return requiredKeys.every(key => Object.hasOwn(value, key)) && keys.every(key => allowed.has(key));
}

function hasExactKeys(value, keys) {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
        && Object.keys(value).length === keys.length
        && keys.every(key => Object.hasOwn(value, key));
}

function isDatabaseId(value) {
    return Number.isInteger(value) && value > 0 && value <= 2147483647;
}

function validateSubmission(body) {
    if (!hasAllowedKeys(body, ['mega_setor_id', 'periodo_id', 'respostas'], ['idempotency_key'])) {
        return 'Informe somente mega_setor_id, periodo_id, respostas e, opcionalmente, idempotency_key.';
    }
    if (Object.hasOwn(body, 'idempotency_key') && body.idempotency_key !== undefined
        && (typeof body.idempotency_key !== 'string' || !UUID_V4_REGEX.test(body.idempotency_key))) {
        return 'idempotency_key deve ser um UUID v4 válido.';
    }
    if (!isDatabaseId(body.mega_setor_id) || !isDatabaseId(body.periodo_id)) {
        return 'Mega-setor e período devem ser IDs inteiros positivos válidos.';
    }
    if (!Array.isArray(body.respostas) || body.respostas.length !== 31) {
        return 'Envie exatamente 31 respostas, uma para cada questão.';
    }
    const seen = new Set();
    for (const answer of body.respostas) {
        if (!hasExactKeys(answer, ['questao_numero', 'alternativa'])) {
            return 'Cada resposta deve conter somente questao_numero e alternativa.';
        }
        const number = answer.questao_numero;
        if (!Number.isInteger(number) || number < 1 || number > 31 || seen.has(number)) {
            return 'As questões devem ser únicas e numeradas de 1 a 31.';
        }
        if (!alternatives[number - 1].includes(answer.alternativa)) {
            return 'Uma ou mais alternativas são inválidas para a respectiva questão.';
        }
        seen.add(number);
    }
    return null;
}

module.exports = { validateSubmission, alternatives, isDatabaseId, UUID_V4_REGEX };
