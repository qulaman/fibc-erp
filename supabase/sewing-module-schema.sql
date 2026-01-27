-- ═══════════════════════════════════════════════════════════════════════════
-- МОДУЛЬ ПОШИВА
-- ═══════════════════════════════════════════════════════════════════════════
-- FIBC Kazakhstan ERP
--
-- ПОТОК ДАННЫХ:
-- Склад кроеных деталей → Пошив → Склад готовой продукции
-- ═══════════════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. СПРАВОЧНИК ОПЕРАЦИЙ ПОШИВА
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sewing_operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    complexity INTEGER DEFAULT 1 CHECK (complexity >= 1 AND complexity <= 5),
    time_norm_minutes NUMERIC(10,2) DEFAULT 0,
    rate_kzt NUMERIC(10,2) DEFAULT 0,
    description TEXT,
    status TEXT DEFAULT 'Активно' CHECK (status IN ('Активно', 'Архив')),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sewing_operations_code ON sewing_operations(code);
CREATE INDEX IF NOT EXISTS idx_sewing_operations_status ON sewing_operations(status);

COMMENT ON TABLE sewing_operations IS 'Справочник операций пошива';
COMMENT ON COLUMN sewing_operations.code IS 'Код операции (например: SEW-001)';
COMMENT ON COLUMN sewing_operations.name IS 'Название операции (например: Пошив тела мешка)';
COMMENT ON COLUMN sewing_operations.category IS 'Категория (Основные, Вспомогательные)';
COMMENT ON COLUMN sewing_operations.complexity IS 'Сложность от 1 до 5';
COMMENT ON COLUMN sewing_operations.time_norm_minutes IS 'Норма времени на 1 изделие в минутах';
COMMENT ON COLUMN sewing_operations.rate_kzt IS 'Расценка за 1 изделие в тенге';

-- Примеры операций
INSERT INTO sewing_operations (code, name, category, complexity, time_norm_minutes, rate_kzt) VALUES
('SEW-001', 'Пошив тела мешка', 'Основные', 3, 15.0, 150),
('SEW-002', 'Пришивание клапана', 'Основные', 2, 8.0, 80),
('SEW-003', 'Пришивание строп', 'Основные', 2, 10.0, 100),
('SEW-004', 'Окантовка верха', 'Вспомогательные', 1, 5.0, 50),
('SEW-005', 'Установка петель', 'Вспомогательные', 1, 3.0, 30)
ON CONFLICT (code) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. СПРАВОЧНИК СПЕЦИФИКАЦИЙ (BOM - Bill of Materials)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sewing_specifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sewing_operation_code TEXT NOT NULL REFERENCES sewing_operations(code) ON DELETE CASCADE,
    cutting_part_code TEXT NOT NULL,
    cutting_part_name TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    status TEXT DEFAULT 'Активно' CHECK (status IN ('Активно', 'Архив')),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(sewing_operation_code, cutting_part_code)
);

CREATE INDEX IF NOT EXISTS idx_sewing_specifications_operation ON sewing_specifications(sewing_operation_code);
CREATE INDEX IF NOT EXISTS idx_sewing_specifications_part ON sewing_specifications(cutting_part_code);

COMMENT ON TABLE sewing_specifications IS 'Спецификации операций пошива - какие детали нужны';
COMMENT ON COLUMN sewing_specifications.sewing_operation_code IS 'Код операции пошива';
COMMENT ON COLUMN sewing_specifications.cutting_part_code IS 'Код кроеной детали из справочника cutting_types';
COMMENT ON COLUMN sewing_specifications.quantity IS 'Количество деталей на 1 изделие';

-- Примеры спецификаций (настройте под ваши реальные детали)
INSERT INTO sewing_specifications (sewing_operation_code, cutting_part_code, cutting_part_name, quantity) VALUES
('SEW-001', 'DON-90-90', 'Донышко квадратное 90x90 см', 1),
('SEW-001', 'BOK-180-90', 'Боковина 180x90 см', 4),
('SEW-002', 'BOK-200-100', 'Боковина 200x100 см', 1),
('SEW-003', 'PET-40-15', 'Петля 40см ширина 15мм', 4)
ON CONFLICT (sewing_operation_code, cutting_part_code) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ЖУРНАЛ ПРОИЗВОДСТВА ПОШИВА
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS production_sewing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_number TEXT NOT NULL UNIQUE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIME,

    -- Швея и операция
    seamstress TEXT NOT NULL,
    operation_code TEXT NOT NULL,
    operation_name TEXT NOT NULL,
    operation_category TEXT,

    -- Количество
    quantity_good INTEGER NOT NULL CHECK (quantity_good >= 0),
    quantity_defect INTEGER DEFAULT 0 CHECK (quantity_defect >= 0),

    -- Расчёт
    time_norm_minutes NUMERIC(10,2) DEFAULT 0,
    amount_kzt NUMERIC(10,2) DEFAULT 0,

    -- Метаданные
    shift_master TEXT,
    notes TEXT,
    status TEXT DEFAULT 'Проведено',

    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_production_sewing_date ON production_sewing(date);
CREATE INDEX IF NOT EXISTS idx_production_sewing_seamstress ON production_sewing(seamstress);
CREATE INDEX IF NOT EXISTS idx_production_sewing_operation ON production_sewing(operation_code);

COMMENT ON TABLE production_sewing IS 'Журнал производства пошива';
COMMENT ON COLUMN production_sewing.seamstress IS 'ФИО швеи';
COMMENT ON COLUMN production_sewing.operation_code IS 'Код операции из справочника';
COMMENT ON COLUMN production_sewing.quantity_good IS 'Количество годных изделий';
COMMENT ON COLUMN production_sewing.quantity_defect IS 'Количество брака';
COMMENT ON COLUMN production_sewing.amount_kzt IS 'Сумма к оплате в тенге';


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. СКЛАД ГОТОВОЙ ПРОДУКЦИИ
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS finished_goods_warehouse (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_number TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    time TIME WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIME,
    operation TEXT NOT NULL CHECK (operation IN ('Приход', 'Расход', 'Возврат')),

    -- Информация о продукции
    product_code TEXT NOT NULL,
    product_name TEXT NOT NULL,

    -- Количество
    quantity INTEGER NOT NULL CHECK (quantity > 0),

    -- Источник/назначение
    source_doc TEXT,           -- Документ пошива (для Приход)
    destination_client TEXT,   -- Клиент (для Расход)

    -- Метаданные
    status TEXT DEFAULT 'Проведено',
    notes TEXT,

    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_finished_goods_warehouse_code ON finished_goods_warehouse(product_code);
CREATE INDEX IF NOT EXISTS idx_finished_goods_warehouse_date ON finished_goods_warehouse(date);
CREATE INDEX IF NOT EXISTS idx_finished_goods_warehouse_operation ON finished_goods_warehouse(operation);

COMMENT ON TABLE finished_goods_warehouse IS 'Склад готовой продукции (мешки)';


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. VIEW: ОСТАТКИ КРОЕНЫХ ДЕТАЛЕЙ
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW view_cutting_parts_balance AS
SELECT
    cutting_type_code AS code,
    MAX(cutting_type_name) AS name,
    MAX(category) AS category,

    -- Приход
    COALESCE(SUM(CASE WHEN operation = 'Приход' THEN quantity ELSE 0 END), 0) AS total_in,

    -- Расход
    COALESCE(SUM(CASE WHEN operation = 'Расход' THEN quantity ELSE 0 END), 0) AS total_out,

    -- Остаток
    COALESCE(SUM(CASE WHEN operation = 'Приход' THEN quantity ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN operation = 'Расход' THEN quantity ELSE 0 END), 0) AS balance,

    -- Дата последнего движения
    MAX(created_at) AS last_movement
FROM cutting_parts_warehouse
WHERE status = 'Проведено'
GROUP BY cutting_type_code
HAVING
    COALESCE(SUM(CASE WHEN operation = 'Приход' THEN quantity ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN operation = 'Расход' THEN quantity ELSE 0 END), 0) != 0
ORDER BY code;

COMMENT ON VIEW view_cutting_parts_balance IS 'Остатки кроеных деталей на складе';


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. VIEW: ОСТАТКИ ГОТОВОЙ ПРОДУКЦИИ
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW view_finished_goods_balance AS
SELECT
    product_code AS code,
    MAX(product_name) AS name,

    -- Приход
    COALESCE(SUM(CASE WHEN operation IN ('Приход', 'Возврат') THEN quantity ELSE 0 END), 0) AS total_in,

    -- Расход
    COALESCE(SUM(CASE WHEN operation = 'Расход' THEN quantity ELSE 0 END), 0) AS total_out,

    -- Остаток
    COALESCE(SUM(CASE WHEN operation IN ('Приход', 'Возврат') THEN quantity ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN operation = 'Расход' THEN quantity ELSE 0 END), 0) AS balance,

    -- Дата последнего движения
    MAX(created_at) AS last_movement
FROM finished_goods_warehouse
WHERE status = 'Проведено'
GROUP BY product_code
HAVING
    COALESCE(SUM(CASE WHEN operation IN ('Приход', 'Возврат') THEN quantity ELSE 0 END), 0) -
    COALESCE(SUM(CASE WHEN operation = 'Расход' THEN quantity ELSE 0 END), 0) != 0
ORDER BY code;

COMMENT ON VIEW view_finished_goods_balance IS 'Остатки готовой продукции на складе';


-- ═══════════════════════════════════════════════════════════════════════════
-- 7. RLS ПОЛИТИКИ
-- ═══════════════════════════════════════════════════════════════════════════

-- Включаем RLS
ALTER TABLE sewing_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sewing_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_sewing ENABLE ROW LEVEL SECURITY;
ALTER TABLE finished_goods_warehouse ENABLE ROW LEVEL SECURITY;

-- Политики полного доступа для авторизованных пользователей
DROP POLICY IF EXISTS "Enable all for authenticated users" ON sewing_operations;
CREATE POLICY "Enable all for authenticated users" ON sewing_operations FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON sewing_specifications;
CREATE POLICY "Enable all for authenticated users" ON sewing_specifications FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON production_sewing;
CREATE POLICY "Enable all for authenticated users" ON production_sewing FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all for authenticated users" ON finished_goods_warehouse;
CREATE POLICY "Enable all for authenticated users" ON finished_goods_warehouse FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ═══════════════════════════════════════════════════════════════════════════
-- 8. ТРИГГЕРЫ ДЛЯ UPDATED_AT
-- ═══════════════════════════════════════════════════════════════════════════

-- Функция уже должна существовать из модуля кроя, но создадим с IF NOT EXISTS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры
DROP TRIGGER IF EXISTS update_sewing_operations_updated_at ON sewing_operations;
CREATE TRIGGER update_sewing_operations_updated_at
    BEFORE UPDATE ON sewing_operations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sewing_specifications_updated_at ON sewing_specifications;
CREATE TRIGGER update_sewing_specifications_updated_at
    BEFORE UPDATE ON sewing_specifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_production_sewing_updated_at ON production_sewing;
CREATE TRIGGER update_production_sewing_updated_at
    BEFORE UPDATE ON production_sewing
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_finished_goods_warehouse_updated_at ON finished_goods_warehouse;
CREATE TRIGGER update_finished_goods_warehouse_updated_at
    BEFORE UPDATE ON finished_goods_warehouse
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════════════
-- ГОТОВО!
-- ═══════════════════════════════════════════════════════════════════════════
--
-- СЛЕДУЮЩИЕ ШАГИ:
-- 1. Запустите этот скрипт в Supabase SQL Editor
-- 2. Проверьте работу страниц:
--    - /production/sewing
--    - /warehouse/cutting-parts
--    - /warehouse/finished-goods
-- 3. Настройте спецификации под ваши реальные детали
-- ═══════════════════════════════════════════════════════════════════════════
