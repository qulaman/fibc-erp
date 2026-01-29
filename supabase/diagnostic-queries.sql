-- =====================================================
-- ДИАГНОСТИЧЕСКИЕ ЗАПРОСЫ ДЛЯ ОТЧЕТОВ
-- Выполните эти запросы в Supabase SQL Editor
-- =====================================================

-- 1. СПИСОК ВСЕХ ТАБЛИЦ В СХЕМЕ PUBLIC
SELECT
    schemaname,
    tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. ПРОВЕРКА ТАБЛИЦ ПРОИЗВОДСТВА
-- Экструзия
SELECT COUNT(*) as total_records,
       SUM(weight_kg) as total_weight,
       MIN(date) as earliest_date,
       MAX(date) as latest_date
FROM production_extrusion;

-- Ткачество (рулоны)
SELECT COUNT(*) as total_records,
       SUM(total_weight) as total_weight,
       MIN(created_at::date) as earliest_date,
       MAX(created_at::date) as latest_date
FROM weaving_rolls;

-- Ламинация
SELECT COUNT(*) as total_records,
       SUM(output_weight) as total_weight,
       MIN(date) as earliest_date,
       MAX(date) as latest_date
FROM production_lamination;

-- Стропы
SELECT COUNT(*) as total_records,
       SUM(weight_kg) as total_weight,
       MIN(date) as earliest_date,
       MAX(date) as latest_date
FROM production_straps;

-- Пошив
SELECT COUNT(*) as total_records,
       SUM(quantity) as total_quantity,
       MIN(date) as earliest_date,
       MAX(date) as latest_date
FROM production_sewing_daily;

-- 3. ПРОВЕРКА СКЛАДОВ
-- Проверяем какие таблицы складов существуют
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND (tablename LIKE '%warehouse%' OR tablename LIKE '%inventory%' OR tablename LIKE '%stock%')
ORDER BY tablename;

-- Проверяем VIEW
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND (table_name LIKE '%warehouse%' OR table_name LIKE '%balance%' OR table_name LIKE '%inventory%')
ORDER BY table_name;

-- 4. СТРУКТУРА ТАБЛИЦЫ weaving_rolls
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'weaving_rolls'
ORDER BY ordinal_position;

-- 5. ДАННЫЕ ИЗ weaving_rolls
SELECT
    id,
    roll_number,
    status,
    total_weight,
    total_length,
    created_at
FROM weaving_rolls
ORDER BY created_at DESC
LIMIT 10;

-- 6. СТРУКТУРА ТАБЛИЦЫ laminated_rolls (если существует)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'laminated_rolls'
ORDER BY ordinal_position;

-- 7. ДАННЫЕ ИЗ laminated_rolls
SELECT
    id,
    roll_number,
    status,
    weight,
    length,
    created_at
FROM laminated_rolls
ORDER BY created_at DESC
LIMIT 10;

-- 8. СТРУКТУРА straps_warehouse
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'straps_warehouse'
ORDER BY ordinal_position;

-- 9. ДАННЫЕ ИЗ straps_warehouse
SELECT
    id,
    roll_number,
    status,
    weight_kg,
    created_at
FROM straps_warehouse
ORDER BY created_at DESC
LIMIT 10;

-- 10. ПРОВЕРКА view_sewn_products_balance
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'view_sewn_products_balance'
ORDER BY ordinal_position;

-- 11. ДАННЫЕ ИЗ view_sewn_products_balance
SELECT *
FROM view_sewn_products_balance
LIMIT 10;

-- 12. ПРОВЕРКА qc_inspections
SELECT COUNT(*) as total_records,
       SUM(quantity_good) as total_good,
       SUM(quantity_defect) as total_defect,
       MIN(inspection_date) as earliest_date,
       MAX(inspection_date) as latest_date
FROM qc_inspections;

-- 13. ПОСЛЕДНИЕ 30 ДНЕЙ ПРОИЗВОДСТВА (ПО ВСЕМ ЦЕХАМ)
-- Экструзия за последние 30 дней
SELECT
    date,
    COUNT(*) as records,
    SUM(weight_kg) as total_kg
FROM production_extrusion
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY date
ORDER BY date DESC;

-- Ткачество за последние 30 дней
SELECT
    created_at::date as date,
    COUNT(*) as records,
    SUM(total_weight) as total_kg
FROM weaving_rolls
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY created_at::date
ORDER BY date DESC;

-- 14. СКЛАДЫ - ТЕКУЩИЕ ОСТАТКИ
-- Рулоны ткани (готовые к использованию)
SELECT
    status,
    COUNT(*) as roll_count,
    SUM(total_weight) as total_weight_kg
FROM weaving_rolls
GROUP BY status;

-- Ламинированная ткань
SELECT
    status,
    COUNT(*) as roll_count,
    SUM(weight) as total_weight_kg
FROM laminated_rolls
GROUP BY status;

-- Стропы
SELECT
    status,
    COUNT(*) as roll_count,
    SUM(weight_kg) as total_weight_kg
FROM straps_warehouse
GROUP BY status;

-- 15. ПРОВЕРКА - ЕСТЬ ЛИ ДАННЫЕ ЗА ПОСЛЕДНИЕ 30 ДНЕЙ
SELECT
    'production_extrusion' as table_name,
    COUNT(*) as records_last_30_days
FROM production_extrusion
WHERE date >= CURRENT_DATE - INTERVAL '30 days'

UNION ALL

SELECT
    'weaving_rolls' as table_name,
    COUNT(*) as records_last_30_days
FROM weaving_rolls
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'

UNION ALL

SELECT
    'production_lamination' as table_name,
    COUNT(*) as records_last_30_days
FROM production_lamination
WHERE date >= CURRENT_DATE - INTERVAL '30 days'

UNION ALL

SELECT
    'production_straps' as table_name,
    COUNT(*) as records_last_30_days
FROM production_straps
WHERE date >= CURRENT_DATE - INTERVAL '30 days'

UNION ALL

SELECT
    'production_sewing_daily' as table_name,
    COUNT(*) as records_last_30_days
FROM production_sewing_daily
WHERE date >= CURRENT_DATE - INTERVAL '30 days';
