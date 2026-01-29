-- БЫСТРАЯ ПРОВЕРКА СТРУКТУРЫ ТАБЛИЦ

-- 1. Структура production_extrusion
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'production_extrusion'
ORDER BY ordinal_position;

-- 2. Пример данных из production_extrusion
SELECT *
FROM production_extrusion
ORDER BY created_at DESC
LIMIT 3;

-- 3. Структура production_straps
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'production_straps'
ORDER BY ordinal_position;

-- 4. Пример данных из production_straps
SELECT *
FROM production_straps
ORDER BY date DESC
LIMIT 3;

-- 5. Все таблицы которые начинаются с production_
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename LIKE 'production_%'
ORDER BY tablename;
