
CREATE TABLE setores (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE periodos_coleta (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    data_inicio TIMESTAMPTZ NOT NULL,
    data_fim TIMESTAMPTZ NOT NULL,
    CONSTRAINT periodo_valido CHECK (data_fim > data_inicio)
);

CREATE TABLE participacoes (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    setor_id INT NOT NULL REFERENCES setores(id),
    periodo_id INT NOT NULL REFERENCES periodos_coleta(id),
    enviado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE respostas (
    participacao_id BIGINT NOT NULL REFERENCES participacoes(id),
    questao_numero INT NOT NULL CHECK (questao_numero BETWEEN 1 AND 31),
    alternativa VARCHAR(50) NOT NULL,
    PRIMARY KEY (participacao_id, questao_numero)
);
