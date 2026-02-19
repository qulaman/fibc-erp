-- ============================================
-- ПОЛНАЯ СХЕМА БАЗЫ ДАННЫХ
-- Выполните этот запрос в Supabase SQL Editor
-- Скопируйте ВЕСЬ результат и сохраните в файл
-- ============================================

-- 1. Список всех таблиц
SELECT '-- ТАБЛИЦА: ' || table_name as info
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Структура каждой таблицы
SELECT
    table_name,
    column_name,
    data_type,
    COALESCE(character_maximum_length::text, '') as max_length,
    column_default,
    is_nullable,
    CASE
        WHEN column_name IN (
            SELECT column_name
            FROM information_schema.key_column_usage
            WHERE table_name = c.table_name
            AND constraint_name LIKE '%_pkey'
        ) THEN 'PRIMARY KEY'
        ELSE ''
    END as key_type
FROM information_schema.columns c
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 3. Внешние ключи
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;

-- 4. Функции
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
