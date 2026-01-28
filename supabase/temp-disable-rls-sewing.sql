-- ВРЕМЕННОЕ ОТКЛЮЧЕНИЕ RLS для отладки
-- ВНИМАНИЕ: Это небезопасно в продакшене!

-- Отключаем RLS для всех таблиц модуля пошива
ALTER TABLE sewing_operations DISABLE ROW LEVEL SECURITY;
ALTER TABLE sewing_specifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_sewing DISABLE ROW LEVEL SECURITY;

-- Проверяем
SELECT 'sewing_operations' as table_name, COUNT(*) as count FROM sewing_operations
UNION ALL
SELECT 'sewing_specifications' as table_name, COUNT(*) as count FROM sewing_specifications
UNION ALL
SELECT 'production_sewing' as table_name, COUNT(*) as count FROM production_sewing;

-- Чтобы ВКЛЮЧИТЬ обратно, выполните:
-- ALTER TABLE sewing_operations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sewing_specifications ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE production_sewing ENABLE ROW LEVEL SECURITY;
