-- Получить структуру таблицы production_weaving
SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'production_weaving'
ORDER BY ordinal_position;
