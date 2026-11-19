-- Additive publication snapshot at mega-sector + closed-period granularity.
-- Existing sector rows, IDs, publications and participation records are retained.
ALTER TABLE admin_publicacoes DROP CONSTRAINT IF EXISTS admin_publicacoes_politica_check;
ALTER TABLE admin_publicacoes ADD CONSTRAINT admin_publicacoes_politica_check
    CHECK (politica IN ('setor_exato_periodo_fechado_v1', 'mega_setor_periodo_fechado_v1'));

CREATE TABLE admin_macrogrupos_publicados (
    periodo_id INT NOT NULL REFERENCES admin_publicacoes(periodo_id),
    macroarea_id INT NOT NULL REFERENCES macroareas(id) ON DELETE RESTRICT,
    payload JSONB NOT NULL,
    PRIMARY KEY (periodo_id, macroarea_id)
);

CREATE FUNCTION admin_macrogrupo_guard() RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' AND EXISTS (
        SELECT 1 FROM admin_publicacoes
        WHERE periodo_id = NEW.periodo_id
            AND politica = 'mega_setor_periodo_fechado_v1'
            AND publicacao_transacao = txid_current()
    ) THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Mega-sector publication snapshots are immutable';
END;
$$;

CREATE TRIGGER admin_macrogrupo_guard BEFORE INSERT OR UPDATE OR DELETE ON admin_macrogrupos_publicados
    FOR EACH ROW EXECUTE FUNCTION admin_macrogrupo_guard();

-- The HTTP service should have SELECT-only access to this table.
-- Publication is a local operator action and has no HTTP write endpoint.
