
const express = require('express');

const app = express();

const PORT = 3000;

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        mensagem: 'Backend do Inventario Psicossocial funcionando!'
    });
});


const pool = require('./db');

app.get('/db-health', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT NOW()');

        res.json({
            status: 'ok',
            mensagem: 'Conexao com PostgreSQL funcionando!',
            horario: resultado.rows[0].now
        });
    } catch (erro) {
        console.error('Erro ao conectar ao banco:', erro.code);

        res.status(500).json({
            status: 'erro',
            mensagem: 'Falha na conexao com o banco.'
        });
    }
});

app.get('/setores', async (req, res) => {
    try {
        const resultado = await pool.query('SELECT * FROM setores');

        res.json(resultado.rows);
    } catch (erro) {
        console.error('Erro ao consultar setores:', erro.code);

        res.status(500).json({
            mensagem: 'Erro ao consultar setores'
        });
    }
});

app.get('/periodos', async(req, res) => {

try{ const resultado = await pool.query('SELECT * FROM periodos_coleta');
    res.json(resultado.rows);}

    catch(erro){
        console.error('Erro ao consultar os periodos:', erro.code);
        res.status(500).json({
            mensagem: 'Erro ao consultar periodos'
        });
    }
});



app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
