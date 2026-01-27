-- ═══════════════════════════════════════════════════════════════════════════
-- УПРОЩЕННЫЙ МОДУЛЬ СТРОП (Simple Straps Module)
-- Совместим с текущим кодом страницы производства
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. СПРАВОЧНИК ТИПОВ СТРОП
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS strap_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  width NUMERIC(10,2),

  description TEXT,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strap_types_code ON strap_types(code);
CREATE INDEX IF NOT EXISTS idx_strap_types_active ON strap_types(is_active);

COMMENT ON TABLE strap_types IS 'Справочник типов строп';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ЖУРНАЛ ПРОИЗВОДСТВА СТРОП
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS production_straps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Дата и смена
  date DATE NOT NULL,
  shift VARCHAR(20) NOT NULL,

  -- Оборудование и персонал
  machine_id UUID REFERENCES equipment(id),
  operator_id UUID REFERENCES employees(id),

  -- Тип стропы
  strap_type_id UUID REFERENCES strap_types(id) NOT NULL,

  -- Произведено
  produced_length NUMERIC(10,2) NOT NULL,
  produced_weight NUMERIC(10,2) NOT NULL,

  -- Примечания (включает состав материалов в JSON)
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_straps_date ON production_straps(date);
CREATE INDEX IF NOT EXISTS idx_production_straps_strap_type ON production_straps(strap_type_id);
CREATE INDEX IF NOT EXISTS idx_production_straps_machine ON production_straps(machine_id);

COMMENT ON TABLE production_straps IS 'Журнал производства строп';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. СКЛАД СТРОП
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS straps_warehouse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Номер рулона (генерируется автоматически)
  roll_number VARCHAR(100) UNIQUE,

  -- Ссылка на производство
  production_id UUID REFERENCES production_straps(id),

  -- Тип стропы
  strap_type_id UUID REFERENCES strap_types(id) NOT NULL,

  -- Характеристики
  produced_length NUMERIC(10,2) NOT NULL,
  produced_weight NUMERIC(10,2) NOT NULL,

  -- Альтернативные названия для совместимости
  length NUMERIC(10,2), -- алиас для produced_length
  weight NUMERIC(10,2), -- алиас для produced_weight

  -- Статус
  status VARCHAR(50) DEFAULT 'available', -- available, used, sold

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_straps_warehouse_strap_type ON straps_warehouse(strap_type_id);
CREATE INDEX IF NOT EXISTS idx_straps_warehouse_status ON straps_warehouse(status);
CREATE INDEX IF NOT EXISTS idx_straps_warehouse_production ON straps_warehouse(production_id);

COMMENT ON TABLE straps_warehouse IS 'Склад готовых строп';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. ТРИГГЕР ДЛЯ АВТОМАТИЧЕСКОГО СОЗДАНИЯ РУЛОНОВ НА СКЛАДЕ
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION auto_create_strap_warehouse_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_roll_number VARCHAR(100);
  v_strap_code VARCHAR(50);
BEGIN
  -- Получаем код стропы
  SELECT code INTO v_strap_code FROM strap_types WHERE id = NEW.strap_type_id;

  -- Генерируем номер рулона: STRAP-ДАТА-КОД-ID
  v_roll_number := 'STRAP-' || TO_CHAR(NEW.date, 'YYYYMMDD') || '-' || COALESCE(v_strap_code, 'UNKNOWN') || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);

  -- Создаем запись на складе
  INSERT INTO straps_warehouse (
    roll_number,
    production_id,
    strap_type_id,
    produced_length,
    produced_weight,
    length,
    weight,
    status
  ) VALUES (
    v_roll_number,
    NEW.id,
    NEW.strap_type_id,
    NEW.produced_length,
    NEW.produced_weight,
    NEW.produced_length, -- дублируем для совместимости
    NEW.produced_weight, -- дублируем для совместимости
    'available'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Создаем триггер на вставку в production_straps
DROP TRIGGER IF EXISTS trigger_auto_create_strap_warehouse ON production_straps;
CREATE TRIGGER trigger_auto_create_strap_warehouse
  AFTER INSERT ON production_straps
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_strap_warehouse_entry();

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. ТРИГГЕРЫ ДЛЯ ОБНОВЛЕНИЯ TIMESTAMPS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_strap_types_updated_at ON strap_types;
CREATE TRIGGER update_strap_types_updated_at
  BEFORE UPDATE ON strap_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_production_straps_updated_at ON production_straps;
CREATE TRIGGER update_production_straps_updated_at
  BEFORE UPDATE ON production_straps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_straps_warehouse_updated_at ON straps_warehouse;
CREATE TRIGGER update_straps_warehouse_updated_at
  BEFORE UPDATE ON straps_warehouse
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. НАЧАЛЬНЫЕ ДАННЫЕ - ПРИМЕРЫ ТИПОВ СТРОП
-- ═══════════════════════════════════════════════════════════════════════════

-- Можно добавить начальные типы строп для тестирования
-- INSERT INTO strap_types (code, name, width, description) VALUES
-- ('ST-100', 'Стропа 100мм', 100, 'Стандартная стропа 100мм'),
-- ('ST-150', 'Стропа 150мм', 150, 'Стандартная стропа 150мм'),
-- ('ST-200', 'Стропа 200мм', 200, 'Широкая стропа 200мм');
