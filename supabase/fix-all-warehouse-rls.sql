-- =====================================================
-- ИСПРАВЛЕНИЕ RLS ДЛЯ ВСЕХ СКЛАДСКИХ ТАБЛИЦ
-- =====================================================
-- Универсальный скрипт для настройки Row Level Security

-- =====================================================
-- 1. СКЛАД ГОТОВОЙ ПРОДУКЦИИ
-- =====================================================

ALTER TABLE finished_goods_warehouse ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to finished_goods_warehouse" ON finished_goods_warehouse;
CREATE POLICY "Allow all access to finished_goods_warehouse"
    ON finished_goods_warehouse FOR ALL TO public
    USING (true) WITH CHECK (true);

-- =====================================================
-- 2. СКЛАД ОТШИТОЙ ПРОДУКЦИИ
-- =====================================================

ALTER TABLE sewn_products_warehouse ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to sewn_products_warehouse" ON sewn_products_warehouse;
CREATE POLICY "Allow all access to sewn_products_warehouse"
    ON sewn_products_warehouse FOR ALL TO public
    USING (true) WITH CHECK (true);

-- =====================================================
-- 3. ЖУРНАЛ ОТК
-- =====================================================

ALTER TABLE qc_journal ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to qc_journal" ON qc_journal;
CREATE POLICY "Allow all access to qc_journal"
    ON qc_journal FOR ALL TO public
    USING (true) WITH CHECK (true);

-- =====================================================
-- 4. СПРАВОЧНИК ГОТОВОЙ ПРОДУКЦИИ
-- =====================================================

ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to product_catalog" ON product_catalog;
CREATE POLICY "Allow all access to product_catalog"
    ON product_catalog FOR ALL TO public
    USING (true) WITH CHECK (true);

-- =====================================================
-- 5. СКЛАД КРОЕНЫХ ДЕТАЛЕЙ
-- =====================================================

ALTER TABLE cutting_parts_warehouse ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to cutting_parts_warehouse" ON cutting_parts_warehouse;
CREATE POLICY "Allow all access to cutting_parts_warehouse"
    ON cutting_parts_warehouse FOR ALL TO public
    USING (true) WITH CHECK (true);

-- =====================================================
-- 6. ПРОИЗВОДСТВО ПОШИВА
-- =====================================================

ALTER TABLE production_sewing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to production_sewing" ON production_sewing;
CREATE POLICY "Allow all access to production_sewing"
    ON production_sewing FOR ALL TO public
    USING (true) WITH CHECK (true);

-- =====================================================
-- ГОТОВО!
-- =====================================================

SELECT 'RLS policies updated for all warehouse tables!' AS message;

-- Проверка политик
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN (
    'finished_goods_warehouse',
    'sewn_products_warehouse',
    'qc_journal',
    'product_catalog',
    'cutting_parts_warehouse',
    'production_sewing'
)
ORDER BY tablename, policyname;
