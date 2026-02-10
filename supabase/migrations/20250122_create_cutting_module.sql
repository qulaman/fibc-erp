-- ═══════════════════════════════════════════════════════════════════════════
-- МОДУЛЬ КРОЯ
-- ═══════════════════════════════════════════════════════════════════════════
-- Создание таблиц для модуля кроя ткани, ламината и строп
-- Дата: 2025-01-22

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. СПРАВОЧНИК ТИПОВ КРОЯ (ДЕТАЛЕЙ)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cutting_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  material_type TEXT NOT NULL CHECK (material_type IN ('Ткань', 'Ткань/Ламинат', 'Ламинат', 'Стропа')),
  width_cm NUMERIC(10,2),
  length_cm NUMERIC(10,2),
  consumption_cm NUMERIC(10,2) NOT NULL,
  weight_g NUMERIC(10,2),
  description TEXT,
  status TEXT DEFAULT 'Активно' CHECK (status IN ('Активно', 'Неактивно')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE cutting_types IS 'Справочник типов кроя - какие детали можно раскроить';
COMMENT ON COLUMN cutting_types.code IS 'Уникальный код детали';
COMMENT ON COLUMN cutting_types.category IS 'Категория детали (донышко, боковина, петля и т.д.)';
COMMENT ON COLUMN cutting_types.material_type IS 'Из какого материала кроится';
COMMENT ON COLUMN cutting_types.consumption_cm IS 'Расход материала на 1 деталь в сантиметрах';

CREATE INDEX IF NOT EXISTS idx_cutting_types_material_type ON cutting_types(material_type);
CREATE INDEX IF NOT EXISTS idx_cutting_types_status ON cutting_types(status);


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ЖУРНАЛ ПРОИЗВОДСТВА КРОЯ
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS production_cutting (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doc_number TEXT NOT NULL UNIQUE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME NOT NULL DEFAULT CURRENT_TIME,
  shift TEXT CHECK (shift IN ('День', 'Ночь')),
  operator TEXT NOT NULL,

  -- Источник материала
  roll_number TEXT NOT NULL,
  material_type TEXT NOT NULL CHECK (material_type IN ('Ткань', 'Ламинат', 'Стропа')),
  material_code TEXT NOT NULL,
  total_used_m NUMERIC(10,2) NOT NULL,

  -- Что произведено
  cutting_type_category TEXT NOT NULL,
  cutting_type_code TEXT NOT NULL,
  cutting_type_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),

  -- Расчеты
  consumption_m NUMERIC(10,2) NOT NULL,
  waste_m NUMERIC(10,2) DEFAULT 0,
  total_weight_kg NUMERIC(10,2),

  status TEXT DEFAULT 'Проведено' CHECK (status IN ('Черновик', 'В работе', 'Проведено', 'Отменено')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE production_cutting IS 'Журнал производства кроя - история всех операций раскроя';
COMMENT ON COLUMN production_cutting.roll_number IS 'Номер рулона ткани/ламината или код стропы';
COMMENT ON COLUMN production_cutting.total_used_m IS 'Всего израсходовано материала (расход + отходы)';
COMMENT ON COLUMN production_cutting.consumption_m IS 'Чистый расход на детали';
COMMENT ON COLUMN production_cutting.waste_m IS 'Отходы (обрезки, брак)';

CREATE INDEX IF NOT EXISTS idx_production_cutting_date ON production_cutting(date DESC);
CREATE INDEX IF NOT EXISTS idx_production_cutting_operator ON production_cutting(operator);
CREATE INDEX IF NOT EXISTS idx_production_cutting_material_type ON production_cutting(material_type);
CREATE INDEX IF NOT EXISTS idx_production_cutting_roll ON production_cutting(roll_number);
CREATE INDEX IF NOT EXISTS idx_production_cutting_cutting_type ON production_cutting(cutting_type_code);


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. СКЛАД КРОЕНЫХ ДЕТАЛЕЙ
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS cutting_parts_warehouse (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doc_number TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME NOT NULL DEFAULT CURRENT_TIME,
  operation TEXT NOT NULL CHECK (operation IN ('Приход', 'Расход')),

  cutting_type_code TEXT NOT NULL,
  cutting_type_name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL,

  source_number TEXT,
  operator TEXT,
  status TEXT DEFAULT 'Проведено' CHECK (status IN ('Черновик', 'Проведено', 'Отменено')),
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE cutting_parts_warehouse IS 'Складской учет кроеных деталей';
COMMENT ON COLUMN cutting_parts_warehouse.operation IS 'Приход - оприходование, Расход - отпуск в пошив';
COMMENT ON COLUMN cutting_parts_warehouse.source_number IS 'Номер рулона-источника (для прихода) или номер документа (для расхода)';

CREATE INDEX IF NOT EXISTS idx_cutting_parts_date ON cutting_parts_warehouse(date DESC);
CREATE INDEX IF NOT EXISTS idx_cutting_parts_operation ON cutting_parts_warehouse(operation);
CREATE INDEX IF NOT EXISTS idx_cutting_parts_code ON cutting_parts_warehouse(cutting_type_code);


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. ПРЕДСТАВЛЕНИЕ: ОСТАТКИ КРОЕНЫХ ДЕТАЛЕЙ
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW cutting_parts_balance AS
SELECT
  cutting_type_code,
  cutting_type_name,
  category,
  SUM(CASE WHEN operation = 'Приход' THEN quantity ELSE 0 END) as total_received,
  SUM(CASE WHEN operation = 'Расход' THEN quantity ELSE 0 END) as total_used,
  SUM(CASE WHEN operation = 'Приход' THEN quantity ELSE -quantity END) as balance
FROM cutting_parts_warehouse
WHERE status = 'Проведено'
GROUP BY cutting_type_code, cutting_type_name, category
HAVING SUM(CASE WHEN operation = 'Приход' THEN quantity ELSE -quantity END) > 0;

COMMENT ON VIEW cutting_parts_balance IS 'Текущие остатки кроеных деталей на складе';


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. ФУНКЦИЯ ОБНОВЛЕНИЯ UPDATED_AT
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автообновления updated_at
CREATE TRIGGER update_cutting_types_updated_at
  BEFORE UPDATE ON cutting_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_cutting_updated_at
  BEFORE UPDATE ON production_cutting
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cutting_parts_warehouse_updated_at
  BEFORE UPDATE ON cutting_parts_warehouse
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. ТЕСТОВЫЕ ДАННЫЕ: ТИПЫ КРОЯ
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO cutting_types (code, category, name, material_type, width_cm, length_cm, consumption_cm, weight_g, description) VALUES
-- Детали из ткани
('DON-90-90', 'Донышко', 'Донышко квадратное 90x90 см', 'Ткань', 90, 90, 95, 180, 'Донышко для стандартного мешка'),
('BOK-180-90', 'Боковина', 'Боковина 180x90 см', 'Ткань/Ламинат', 180, 90, 185, 320, 'Боковая стенка мешка'),
('BOK-200-100', 'Боковина', 'Боковина 200x100 см', 'Ткань/Ламинат', 200, 100, 205, 400, 'Увеличенная боковина'),

-- Детали из строп
('PET-40-15', 'Петля', 'Петля 40см ширина 15мм', 'Стропа', NULL, 40, 45, 25, 'Стандартная подъемная петля'),
('PET-50-20', 'Петля', 'Петля 50см ширина 20мм', 'Стропа', NULL, 50, 55, 35, 'Усиленная петля'),
('ZAP-30-15', 'Запчасть', 'Запорная лента 30см', 'Стропа', NULL, 30, 32, 18, 'Лента для запора мешка');

COMMENT ON TABLE cutting_types IS 'Справочник заполнен тестовыми данными';


-- ═══════════════════════════════════════════════════════════════════════════
-- КОНЕЦ МИГРАЦИИ
-- ═══════════════════════════════════════════════════════════════════════════
