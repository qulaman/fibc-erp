-- ═══════════════════════════════════════════════════════════════════════════
-- ТАБЛИЦА СКЛАДА СЫРЬЯ (ИНВЕНТАРИЗАЦИЯ)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS raw_materials_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Материал
  material_id UUID REFERENCES raw_materials(id),

  -- Количество на складе
  quantity NUMERIC(10,2) DEFAULT 0,

  -- Минимальный остаток (для оповещений)
  min_quantity NUMERIC(10,2) DEFAULT 0,

  -- Дата последнего обновления
  last_updated TIMESTAMP DEFAULT NOW(),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(material_id)
);

-- Индекс для быстрого поиска по материалу
CREATE INDEX IF NOT EXISTS idx_raw_materials_inventory_material ON raw_materials_inventory(material_id);

-- Комментарии
COMMENT ON TABLE raw_materials_inventory IS 'Складской учет сырья (гранул)';
COMMENT ON COLUMN raw_materials_inventory.quantity IS 'Текущее количество на складе (кг)';
COMMENT ON COLUMN raw_materials_inventory.min_quantity IS 'Минимальный остаток для оповещения';
