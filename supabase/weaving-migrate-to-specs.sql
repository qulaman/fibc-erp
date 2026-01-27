-- ═══════════════════════════════════════════════════════════════════════════
-- МИГРАЦИЯ: Переход от fabric_types к tkan_specifications
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Добавляем новые поля в production_weaving
ALTER TABLE production_weaving
  ADD COLUMN IF NOT EXISTS fabric_spec_id INTEGER,
  ADD COLUMN IF NOT EXISTS fabric_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS fabric_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS weft_denier INTEGER,
  ADD COLUMN IF NOT EXISTS warp_denier INTEGER;

-- 2. Добавляем новые поля в fabric_inventory
ALTER TABLE fabric_inventory
  ADD COLUMN IF NOT EXISTS fabric_spec_id INTEGER,
  ADD COLUMN IF NOT EXISTS fabric_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS fabric_name VARCHAR(255);

-- 3. Создаем индексы для новых полей
CREATE INDEX IF NOT EXISTS idx_weaving_spec ON production_weaving(fabric_spec_id);
CREATE INDEX IF NOT EXISTS idx_fabric_inv_spec ON fabric_inventory(fabric_spec_id);

-- 4. КОММЕНТАРИИ
COMMENT ON COLUMN production_weaving.fabric_spec_id IS 'ID спецификации из tkan_specifications';
COMMENT ON COLUMN production_weaving.fabric_code IS 'Код ткани (дублируется для удобства)';
COMMENT ON COLUMN production_weaving.fabric_name IS 'Название ткани (дублируется для удобства)';
COMMENT ON COLUMN production_weaving.weft_denier IS 'Денье утка из спецификации';
COMMENT ON COLUMN production_weaving.warp_denier IS 'Денье основы из спецификации';

COMMENT ON COLUMN fabric_inventory.fabric_spec_id IS 'ID спецификации из tkan_specifications';
COMMENT ON COLUMN fabric_inventory.fabric_code IS 'Код ткани (дублируется для удобства)';
COMMENT ON COLUMN fabric_inventory.fabric_name IS 'Название ткани (дублируется для удобства)';

-- 5. Опционально: удаляем старые поля (ОСТОРОЖНО!)
-- Раскомментируйте только если уверены, что старые данные больше не нужны
-- ALTER TABLE production_weaving DROP COLUMN IF EXISTS fabric_type_id;
-- ALTER TABLE production_weaving DROP COLUMN IF EXISTS weft_yarn_code;
-- ALTER TABLE production_weaving DROP COLUMN IF EXISTS warp_yarn_code;
-- ALTER TABLE fabric_inventory DROP COLUMN IF EXISTS fabric_type_id;
