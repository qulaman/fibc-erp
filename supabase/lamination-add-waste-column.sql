-- Добавление недостающих колонок в production_lamination
ALTER TABLE production_lamination
ADD COLUMN IF NOT EXISTS waste NUMERIC(10,2) DEFAULT 0;

ALTER TABLE production_lamination
ADD COLUMN IF NOT EXISTS dosators JSONB;

COMMENT ON COLUMN production_lamination.waste IS 'Отходы при ламинации (кг)';
COMMENT ON COLUMN production_lamination.dosators IS 'Использованное сырье - массив дозаторов [{material_id: UUID, weight: number}]';
