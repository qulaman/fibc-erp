-- =====================================================
-- МОДУЛЬ ОТК И УПАКОВКИ
-- =====================================================
-- Создание таблиц для модуля технического контроля качества

-- =====================================================
-- 1. СКЛАД ОТШИТОЙ ПРОДУКЦИИ (буфер между пошивом и ОТК)
-- =====================================================

CREATE TABLE IF NOT EXISTS sewn_products_warehouse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Документ
  doc_number VARCHAR(50) UNIQUE NOT NULL,
  operation_date DATE NOT NULL,
  operation_time TIME NOT NULL DEFAULT CURRENT_TIME,

  -- Тип операции
  operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('Приход', 'Расход')),

  -- Изделие
  product_code VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_type VARCHAR(100),

  -- Количество
  quantity INTEGER NOT NULL CHECK (quantity > 0),

  -- Ссылка на документ-основание
  source_doc_number VARCHAR(50),
  source_doc_type VARCHAR(50), -- 'Пошив', 'ОТК', и т.д.

  -- Ответственные
  employee_name VARCHAR(255),
  shift VARCHAR(20),

  -- Дополнительно
  notes TEXT,
  status VARCHAR(20) DEFAULT 'Активно',

  -- Метаданные
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX idx_sewn_products_warehouse_date ON sewn_products_warehouse(operation_date DESC);
CREATE INDEX idx_sewn_products_warehouse_product ON sewn_products_warehouse(product_code);
CREATE INDEX idx_sewn_products_warehouse_operation ON sewn_products_warehouse(operation_type);
CREATE INDEX idx_sewn_products_warehouse_doc ON sewn_products_warehouse(doc_number);

COMMENT ON TABLE sewn_products_warehouse IS 'Склад отшитой продукции - буфер между пошивом и ОТК';

-- =====================================================
-- 2. ЖУРНАЛ ОТК (контроль качества)
-- =====================================================

CREATE TABLE IF NOT EXISTS qc_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Документ
  doc_number VARCHAR(50) UNIQUE NOT NULL,
  inspection_date DATE NOT NULL,
  inspection_time TIME NOT NULL DEFAULT CURRENT_TIME,

  -- Контролер ОТК
  inspector_name VARCHAR(255) NOT NULL,

  -- Изделие
  product_code VARCHAR(50) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  product_type VARCHAR(100),

  -- Результаты проверки
  quantity_good INTEGER NOT NULL DEFAULT 0 CHECK (quantity_good >= 0),
  quantity_defect INTEGER NOT NULL DEFAULT 0 CHECK (quantity_defect >= 0),

  -- Причины брака
  defect_reason TEXT,
  defect_category VARCHAR(100), -- 'Шов', 'Материал', 'Размер', 'Прочее'

  -- Решение
  decision VARCHAR(50) DEFAULT 'Принято', -- 'Принято', 'Отклонено', 'На доработку'

  -- Ссылка на документ-основание (из пошива)
  source_doc_number VARCHAR(50),

  -- Дополнительно
  notes TEXT,
  status VARCHAR(20) DEFAULT 'Активно',

  -- Метаданные
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_qc_journal_date ON qc_journal(inspection_date DESC);
CREATE INDEX idx_qc_journal_product ON qc_journal(product_code);
CREATE INDEX idx_qc_journal_inspector ON qc_journal(inspector_name);
CREATE INDEX idx_qc_journal_decision ON qc_journal(decision);

COMMENT ON TABLE qc_journal IS 'Журнал приёмки ОТК - контроль качества готовых изделий';

-- =====================================================
-- 3. VIEW: ОСТАТКИ НА СКЛАДЕ ОТШИТОЙ ПРОДУКЦИИ
-- =====================================================

CREATE OR REPLACE VIEW view_sewn_products_balance AS
SELECT
  product_code,
  product_name,
  product_type,

  -- Расчет остатков (Приход - Расход)
  SUM(CASE WHEN operation_type = 'Приход' THEN quantity ELSE 0 END) AS total_received,
  SUM(CASE WHEN operation_type = 'Расход' THEN quantity ELSE 0 END) AS total_issued,
  SUM(CASE WHEN operation_type = 'Приход' THEN quantity ELSE -quantity END) AS balance,

  -- Дата последнего движения
  MAX(operation_date) AS last_movement_date,

  -- Метаданные
  NOW() AS calculated_at

FROM sewn_products_warehouse
WHERE status = 'Активно'
GROUP BY product_code, product_name, product_type
HAVING SUM(CASE WHEN operation_type = 'Приход' THEN quantity ELSE -quantity END) > 0
ORDER BY product_name;

COMMENT ON VIEW view_sewn_products_balance IS 'Остатки на складе отшитой продукции';

-- =====================================================
-- 4. VIEW: СТАТИСТИКА ОТК
-- =====================================================

CREATE OR REPLACE VIEW view_qc_statistics AS
SELECT
  product_code,
  product_name,
  product_type,

  -- Общее количество проверенных
  SUM(quantity_good + quantity_defect) AS total_inspected,

  -- Годные и брак
  SUM(quantity_good) AS total_good,
  SUM(quantity_defect) AS total_defect,

  -- Процент брака
  ROUND(
    CASE
      WHEN SUM(quantity_good + quantity_defect) > 0
      THEN (SUM(quantity_defect)::NUMERIC / SUM(quantity_good + quantity_defect)::NUMERIC) * 100
      ELSE 0
    END,
    2
  ) AS defect_percentage,

  -- Количество проверок
  COUNT(*) AS inspection_count,

  -- Период
  MIN(inspection_date) AS first_inspection,
  MAX(inspection_date) AS last_inspection

FROM qc_journal
WHERE status = 'Активно'
GROUP BY product_code, product_name, product_type
ORDER BY total_inspected DESC;

COMMENT ON VIEW view_qc_statistics IS 'Статистика ОТК по изделиям';

-- =====================================================
-- 5. ФУНКЦИЯ: Автоматическое обновление updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для автоматического обновления updated_at
DROP TRIGGER IF EXISTS update_sewn_products_warehouse_updated_at ON sewn_products_warehouse;
CREATE TRIGGER update_sewn_products_warehouse_updated_at
    BEFORE UPDATE ON sewn_products_warehouse
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_qc_journal_updated_at ON qc_journal;
CREATE TRIGGER update_qc_journal_updated_at
    BEFORE UPDATE ON qc_journal
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. RLS (Row Level Security) - Базовая настройка
-- =====================================================

-- Включаем RLS
ALTER TABLE sewn_products_warehouse ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_journal ENABLE ROW LEVEL SECURITY;

-- Политики (базовые - все могут читать и писать)
DROP POLICY IF EXISTS "Allow all access to sewn_products_warehouse" ON sewn_products_warehouse;
CREATE POLICY "Allow all access to sewn_products_warehouse"
    ON sewn_products_warehouse
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to qc_journal" ON qc_journal;
CREATE POLICY "Allow all access to qc_journal"
    ON qc_journal
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- ГОТОВО!
-- =====================================================

-- Проверка созданных объектов
SELECT 'Tables created:' AS message;
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('sewn_products_warehouse', 'qc_journal');

SELECT 'Views created:' AS message;
SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname IN ('view_sewn_products_balance', 'view_qc_statistics');
