-- ═══════════════════════════════════════════════════════════════════════════
-- ПРОВЕРКА СОСТОЯНИЯ ТАБЛИЦ МОДУЛЯ ПОШИВА
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Проверяем существование таблиц
SELECT
    tablename,
    schemaname
FROM pg_tables
WHERE tablename IN (
    'sewing_operations',
    'sewing_specifications',
    'production_sewing',
    'finished_goods_warehouse'
)
ORDER BY tablename;

-- 2. Проверяем количество записей в таблицах
SELECT 'sewing_operations' as table_name, COUNT(*) as record_count FROM sewing_operations
UNION ALL
SELECT 'sewing_specifications', COUNT(*) FROM sewing_specifications
UNION ALL
SELECT 'production_sewing', COUNT(*) FROM production_sewing
UNION ALL
SELECT 'finished_goods_warehouse', COUNT(*) FROM finished_goods_warehouse;

-- 3. Проверяем Views
SELECT
    viewname,
    schemaname
FROM pg_views
WHERE viewname IN (
    'view_cutting_parts_balance',
    'view_finished_goods_balance'
)
ORDER BY viewname;

-- 4. Показываем все операции пошива (если есть)
SELECT * FROM sewing_operations ORDER BY code;

-- 5. Показываем все спецификации (если есть)
SELECT * FROM sewing_specifications ORDER BY sewing_operation_code, cutting_part_code;

-- 6. Проверяем RLS политики
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename IN (
    'sewing_operations',
    'sewing_specifications',
    'production_sewing',
    'finished_goods_warehouse'
)
ORDER BY tablename, policyname;
