-- Структура таблицы production_lamination
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'production_lamination'
ORDER BY ordinal_position;

-- Связанные таблицы (если есть)
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name IN ('laminated_rolls', 'lamination_specifications')
ORDER BY table_name, ordinal_position;
