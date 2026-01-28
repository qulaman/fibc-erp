-- Проверка данных в таблицах модуля пошива

-- 1. Проверяем существование таблиц
SELECT
    tablename,
    schemaname
FROM pg_tables
WHERE tablename IN ('sewing_operations', 'sewing_specifications', 'production_sewing')
ORDER BY tablename;

-- 2. Проверяем количество записей в таблицах
SELECT 'sewing_operations' as table_name, COUNT(*) as record_count
FROM sewing_operations
UNION ALL
SELECT 'sewing_specifications' as table_name, COUNT(*) as record_count
FROM sewing_specifications
UNION ALL
SELECT 'production_sewing' as table_name, COUNT(*) as record_count
FROM production_sewing;

-- 3. Проверяем RLS политики
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('sewing_operations', 'sewing_specifications', 'production_sewing')
ORDER BY tablename, policyname;

-- 4. Проверяем включен ли RLS
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename IN ('sewing_operations', 'sewing_specifications', 'production_sewing')
ORDER BY tablename;

-- 5. Показываем первые 5 записей из sewing_operations
SELECT * FROM sewing_operations LIMIT 5;

-- 6. Показываем структуру таблицы sewing_operations
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'sewing_operations'
ORDER BY ordinal_position;
