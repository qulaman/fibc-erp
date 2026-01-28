-- Проверка RLS настроек для таблицы employees

-- 1. Проверяем включен ли RLS
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'employees';

-- 2. Проверяем политики
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'employees';
