-- ВЫПОЛНИТЕ ЭТО В SUPABASE SQL EDITOR
-- Скопируйте весь результат и пришлите мне

-- 1. Структура таблицы production_extrusion
SELECT
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable,
    udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'production_extrusion'
ORDER BY ordinal_position;

-- 2. Структура таблицы employees
SELECT
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'employees'
ORDER BY ordinal_position;

-- 3. Структура таблицы yarn_warehouse (если существует)
SELECT
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'yarn_warehouse'
ORDER BY ordinal_position;

-- 4. Список ВСЕХ таблиц
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 5. Список ВСЕХ функций
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
