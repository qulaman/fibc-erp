-- ═══════════════════════════════════════════════════════════════════════════
-- МИГРАЦИЯ: Переход экструзии от yarn_types к tkan_specifications
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Добавляем новые поля в production_extrusion
ALTER TABLE production_extrusion
  ADD COLUMN IF NOT EXISTS yarn_denier INTEGER,
  ADD COLUMN IF NOT EXISTS yarn_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS yarn_name VARCHAR(255);

-- 2. Добавляем новые поля в yarn_inventory
ALTER TABLE yarn_inventory
  ADD COLUMN IF NOT EXISTS yarn_denier INTEGER,
  ADD COLUMN IF NOT EXISTS yarn_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS yarn_name VARCHAR(255);

-- 3. Создаем индексы для новых полей
CREATE INDEX IF NOT EXISTS idx_extrusion_denier ON production_extrusion(yarn_denier);
CREATE INDEX IF NOT EXISTS idx_yarn_inv_denier ON yarn_inventory(yarn_denier);
CREATE INDEX IF NOT EXISTS idx_yarn_inv_code ON yarn_inventory(yarn_code);

-- 4. КОММЕНТАРИИ
COMMENT ON COLUMN production_extrusion.yarn_denier IS 'Денье нити из спецификации';
COMMENT ON COLUMN production_extrusion.yarn_code IS 'Код нити (например: PP-800D)';
COMMENT ON COLUMN production_extrusion.yarn_name IS 'Название нити';

COMMENT ON COLUMN yarn_inventory.yarn_denier IS 'Денье нити из спецификации';
COMMENT ON COLUMN yarn_inventory.yarn_code IS 'Код нити (например: PP-800D)';
COMMENT ON COLUMN yarn_inventory.yarn_name IS 'Название нити';

-- 5. Опционально: удаляем старые поля (ОСТОРОЖНО!)
-- Раскомментируйте только если уверены, что старые данные больше не нужны
-- ALTER TABLE production_extrusion DROP COLUMN IF EXISTS yarn_type_id;
-- ALTER TABLE yarn_inventory DROP COLUMN IF EXISTS yarn_type_id;
