-- ============================================
-- ПОЛНЫЙ ЭКСПОРТ СХЕМЫ БАЗЫ ДАННЫХ
-- Выполните в Supabase SQL Editor
-- Скопируйте ВСЕ результаты и сохраните в текстовый файл
-- ============================================

-- ========== БЛОК 1: СПИСОК ВСЕХ ТАБЛИЦ ==========
\echo '=== TABLES ==='
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ========== БЛОК 2: СТРУКТУРА КАЖДОЙ ТАБЛИЦЫ ==========
\echo '=== TABLE STRUCTURES ==='
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

-- ========== БЛОК 3: ВНЕШНИЕ КЛЮЧИ ==========
\echo '=== FOREIGN KEYS ==='
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS references_table,
    ccu.column_name AS references_column,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;

-- ========== БЛОК 4: ФУНКЦИИ И ИХ ПАРАМЕТРЫ ==========
\echo '=== FUNCTIONS ==='
SELECT
    r.routine_name,
    r.data_type as return_type,
    string_agg(
        p.parameter_name || ' ' || p.data_type ||
        CASE WHEN p.parameter_default IS NOT NULL THEN ' DEFAULT ' || p.parameter_default ELSE '' END,
        ', '
        ORDER BY p.ordinal_position
    ) as parameters
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p
    ON r.specific_name = p.specific_name AND p.parameter_mode IN ('IN', 'INOUT')
WHERE r.routine_schema = 'public'
GROUP BY r.routine_name, r.data_type
ORDER BY r.routine_name;

-- ========== БЛОК 5: VIEWS ==========
\echo '=== VIEWS ==='
SELECT
    table_name as view_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- ========== БЛОК 6: ИНДЕКСЫ ==========
\echo '=== INDEXES ==='
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ========== БЛОК 7: ДЕТАЛЬНАЯ ИНФОРМАЦИЯ О КЛЮЧЕВЫХ ТАБЛИЦАХ ==========

-- production_extrusion
\echo '=== DETAIL: production_extrusion ==='
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'production_extrusion'
ORDER BY ordinal_position;

-- employees
\echo '=== DETAIL: employees ==='
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'employees'
ORDER BY ordinal_position;

-- equipment
\echo '=== DETAIL: equipment ==='
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'equipment'
ORDER BY ordinal_position;

-- yarn_warehouse (если существует)
\echo '=== DETAIL: yarn_warehouse ==='
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'yarn_warehouse'
ORDER BY ordinal_position;

-- weaving_rolls (если существует)
\echo '=== DETAIL: weaving_rolls ==='
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'weaving_rolls'
ORDER BY ordinal_position;

-- raw_materials
\echo '=== DETAIL: raw_materials ==='
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'raw_materials'
ORDER BY ordinal_position;

-- tkan_specifications
\echo '=== DETAIL: tkan_specifications ==='
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'tkan_specifications'
ORDER BY ordinal_position;
