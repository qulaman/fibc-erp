-- Исправление RLS политик для модуля пошива

-- 1. Включаем RLS для всех таблиц модуля пошива
ALTER TABLE sewing_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sewing_specifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_sewing ENABLE ROW LEVEL SECURITY;

-- 2. Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Enable all for authenticated users" ON sewing_operations;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON sewing_specifications;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON production_sewing;

-- 3. Создаем новые политики для чтения и записи

-- Политика для sewing_operations (операции пошива)
CREATE POLICY "Enable all for authenticated users" ON sewing_operations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Политика для sewing_specifications (спецификации)
CREATE POLICY "Enable all for authenticated users" ON sewing_specifications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Политика для production_sewing (производство пошива)
CREATE POLICY "Enable all for authenticated users" ON production_sewing
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Проверка: выводим количество записей в каждой таблице
SELECT 'sewing_operations' as table_name, COUNT(*) as count FROM sewing_operations
UNION ALL
SELECT 'sewing_specifications' as table_name, COUNT(*) as count FROM sewing_specifications
UNION ALL
SELECT 'production_sewing' as table_name, COUNT(*) as count FROM production_sewing;
