-- Aplicar no mesmo schema das quatro tabelas. Linhas legadas ficam sem chave.
ALTER TABLE participacoes
    ADD COLUMN chave_envio UUID UNIQUE,
    ADD COLUMN conteudo_hash CHAR(64),
    ADD CONSTRAINT envio_chave_hash CHECK (
        (chave_envio IS NULL AND conteudo_hash IS NULL) OR
        (chave_envio IS NOT NULL AND conteudo_hash IS NOT NULL)
    );
