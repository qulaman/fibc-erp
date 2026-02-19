-- Получить все колонки таблицы tkan_specifications
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tkan_specifications'
ORDER BY ordinal_position;
