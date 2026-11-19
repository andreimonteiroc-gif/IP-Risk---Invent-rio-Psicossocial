-- New participant submissions select a mega-sector directly. Existing rows
-- keep their operational sector_id and continue to inherit its macroarea.
ALTER TABLE participacoes
    ADD COLUMN macroarea_id INT REFERENCES macroareas(id) ON DELETE RESTRICT;

ALTER TABLE participacoes
    ALTER COLUMN setor_id DROP NOT NULL;

ALTER TABLE participacoes
    ADD CONSTRAINT participacoes_exactly_one_sector_reference
    CHECK ((setor_id IS NOT NULL) <> (macroarea_id IS NOT NULL));
