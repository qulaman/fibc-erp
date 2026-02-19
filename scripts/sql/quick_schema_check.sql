-- БЫСТРАЯ ПРОВЕРКА СТРУКТУРЫ ГЛАВНЫХ ТАБЛИЦ
-- Выполните в Supabase SQL Editor и пришлите результат

-- 1. Структура production_extrusion
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'production_extrusion'
ORDER BY ordinal_position;

-- 2. Есть ли поля operator_winder1/2/3?
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'production_extrusion'
AND column_name LIKE 'operator%';

-- 3. Есть ли поля width_mm, color?
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'production_extrusion'
AND column_name IN ('width_mm', 'color', 'yarn_denier', 'batch_number');

-- 4. Существует ли таблица yarn_warehouse?
SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_name = 'yarn_warehouse'
) as yarn_warehouse_exists;

-- 5. Если yarn_warehouse существует, какие в ней поля?
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'yarn_warehouse'
ORDER BY ordinal_position;
