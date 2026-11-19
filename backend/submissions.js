const { createHash } = require('node:crypto');

class SubmissionError extends Error {
    constructor(status, code, message) {
        super(message);
        this.status = status;
        this.code = code;
    }
}

function submissionHash(body, key) {
    // A chave também serve de salt: questionários diferentes não compartilham fingerprint.
    return createHash('sha256').update(key).update('\0').update(JSON.stringify({
        mega_setor_id: body.mega_setor_id,
        periodo_id: body.periodo_id,
        respostas: [...body.respostas].sort((a, b) => a.questao_numero - b.questao_numero)
            .map(({ questao_numero, alternativa }) => ({ questao_numero, alternativa })),
    })).digest('hex');
}

async function saveSubmission(pool, body, key) {
    const hash = submissionHash(body, key);
    const client = await pool.connect();
    let transactionStarted = false;
    let discardConnection = false;
    try {
        await client.query('BEGIN');
        transactionStarted = true;
        const previous = await client.query('SELECT conteudo_hash FROM participacoes WHERE chave_envio = $1', [key]);
        const checkReplay = row => {
            if (row.conteudo_hash !== hash) {
                throw new SubmissionError(409, 'CHAVE_REUTILIZADA', 'A chave de envio já foi usada com outro conteúdo.');
            }
        };
        if (previous.rowCount === 1) {
            checkReplay(previous.rows[0]);
            await client.query('COMMIT');
            transactionStarted = false;
            return;
        }
        const megaSector = await client.query('SELECT id FROM macroareas WHERE id = $1 FOR SHARE', [body.mega_setor_id]);
        if (megaSector.rowCount !== 1) {
            throw new SubmissionError(422, 'MEGA_SETOR_INVALIDO', 'Mega-setor não encontrado.');
        }
        const period = await client.query(`
            SELECT id, (data_inicio <= CURRENT_TIMESTAMP AND CURRENT_TIMESTAMP < data_fim) AS vigente
            FROM periodos_coleta WHERE id = $1 FOR SHARE
        `, [body.periodo_id]);
        if (period.rowCount !== 1 || !period.rows[0].vigente) {
            throw new SubmissionError(422, 'PERIODO_INVALIDO', 'Período inexistente ou fora da vigência.');
        }
        const participation = await client.query(`
            INSERT INTO participacoes (macroarea_id, periodo_id, chave_envio, conteudo_hash)
            VALUES ($1, $2, $3, $4) ON CONFLICT (chave_envio) DO NOTHING RETURNING id
        `, [body.mega_setor_id, body.periodo_id, key, hash]);
        if (participation.rowCount === 0) {
            // A restrição UNIQUE serializa também duas requisições concorrentes.
            const concurrent = await client.query('SELECT conteudo_hash FROM participacoes WHERE chave_envio = $1', [key]);
            if (concurrent.rowCount !== 1) throw new Error('Confirmação de envio indisponível.');
            checkReplay(concurrent.rows[0]);
            await client.query('COMMIT');
            transactionStarted = false;
            return;
        }
        const values = [];
        const placeholders = body.respostas.map((answer, index) => {
            values.push(participation.rows[0].id, answer.questao_numero, answer.alternativa);
            const offset = index * 3;
            return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
        });
        const answers = await client.query(`
            INSERT INTO respostas (participacao_id, questao_numero, alternativa)
            VALUES ${placeholders.join(', ')}
        `, values);
        if (answers.rowCount !== 31) throw new Error('Quantidade inesperada de respostas persistidas.');
        await client.query('COMMIT');
        transactionStarted = false;
    } catch (error) {
        if (transactionStarted) {
            try {
                await client.query('ROLLBACK');
            } catch {
                // Uma conexão cujo rollback falhou não pode voltar ao pool.
                discardConnection = true;
            }
        } else {
            discardConnection = true;
        }
        throw error;
    } finally {
        client.release(discardConnection);
    }
}

module.exports = { saveSubmission, SubmissionError };
