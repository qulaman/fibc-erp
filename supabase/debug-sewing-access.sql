-- Отладка доступа к таблице sewing_operations

-- 1. Проверяем, что таблица существует и в ней есть данные
SELECT 'Всего записей в sewing_operations:' as info, COUNT(*) as count FROM sewing_operations;

-- 2. Показываем первые 3 записи
SELECT * FROM sewing_operations LIMIT 3;

-- 3. Проверяем RLS статус
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'sewing_operations';

-- 4. Проверяем политики RLS
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'sewing_operations';

-- 5. Временно отключаем RLS для теста (ОПАСНО - только для отладки!)
ALTER TABLE sewing_operations DISABLE ROW LEVEL SECURITY;

-- 6. Проверяем снова
SELECT 'После отключения RLS:' as info, COUNT(*) as count FROM sewing_operations;

-- 7. Включаем RLS обратно
ALTER TABLE sewing_operations ENABLE ROW LEVEL SECURITY;

-- 8. Показываем текущие настройки политик
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'sewing_operations';
