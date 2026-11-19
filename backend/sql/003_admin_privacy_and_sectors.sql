-- Migração aditiva; aplicar explicitamente, nunca no startup do servidor.
-- Não preenche catálogo, não renumera setores e não altera participações.
CREATE TABLE macroareas (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE
);
ALTER TABLE setores ADD COLUMN macroarea_id INT REFERENCES macroareas(id) ON DELETE RESTRICT;

CREATE TABLE admin_publicacoes (
    periodo_id INT PRIMARY KEY REFERENCES periodos_coleta(id),
    data_inicio TIMESTAMPTZ NOT NULL,
    data_fim TIMESTAMPTZ NOT NULL,
    publicado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    publicacao_transacao BIGINT NOT NULL DEFAULT txid_current(),
    versao_regras VARCHAR(80) NOT NULL,
    regras_calculo JSONB NOT NULL,
    politica VARCHAR(40) NOT NULL CHECK (politica = 'setor_exato_periodo_fechado_v1'),
    CHECK (data_fim > data_inicio)
);
CREATE TABLE admin_grupos_publicados (
    periodo_id INT NOT NULL REFERENCES admin_publicacoes(periodo_id),
    setor_id INT NOT NULL REFERENCES setores(id),
    payload JSONB NOT NULL,
    PRIMARY KEY (periodo_id, setor_id)
);

CREATE FUNCTION admin_publicacao_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP <> 'INSERT' THEN
        RAISE EXCEPTION 'Publicações são imutáveis';
    END IF;
    -- Serializa publicações para impedir janelas sobrepostas concorrentes.
    PERFORM pg_advisory_xact_lock(817203, 1);
    IF NEW.data_fim > CURRENT_TIMESTAMP THEN
        RAISE EXCEPTION 'Período ainda aberto';
    END IF;
    IF EXISTS (SELECT 1 FROM admin_publicacoes p
        WHERE tstzrange(p.data_inicio, p.data_fim, '[)') && tstzrange(NEW.data_inicio, NEW.data_fim, '[)')) THEN
        RAISE EXCEPTION 'Sobreposição de publicações não permitida';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER admin_publicacao_guard BEFORE INSERT OR UPDATE OR DELETE ON admin_publicacoes
    FOR EACH ROW EXECUTE FUNCTION admin_publicacao_guard();

CREATE FUNCTION admin_grupo_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' AND EXISTS (SELECT 1 FROM admin_publicacoes
        WHERE periodo_id = NEW.periodo_id AND publicacao_transacao = txid_current()) THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Grupos publicados são imutáveis';
END;
$$;
CREATE TRIGGER admin_grupo_guard BEFORE INSERT OR UPDATE OR DELETE ON admin_grupos_publicados
    FOR EACH ROW EXECUTE FUNCTION admin_grupo_guard();

-- O papel do serviço HTTP deve ter apenas SELECT nas duas tabelas admin_*.
-- O publicador é uma operação local separada, sem endpoint HTTP de escrita.
