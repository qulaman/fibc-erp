-- =====================================================
-- ИСПРАВЛЕНИЕ RLS ДЛЯ СКЛАДА ГОТОВОЙ ПРОДУКЦИИ
-- =====================================================

-- Включаем RLS (если не включен)
ALTER TABLE finished_goods_warehouse ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики
DROP POLICY IF EXISTS "Allow all access to finished_goods_warehouse" ON finished_goods_warehouse;
DROP POLICY IF EXISTS "Enable read access for all users" ON finished_goods_warehouse;
DROP POLICY IF EXISTS "Enable insert access for all users" ON finished_goods_warehouse;
DROP POLICY IF EXISTS "Enable update access for all users" ON finished_goods_warehouse;
DROP POLICY IF EXISTS "Enable delete access for all users" ON finished_goods_warehouse;

-- Создаем новую универсальную политику (доступ для всех)
CREATE POLICY "Allow all access to finished_goods_warehouse"
    ON finished_goods_warehouse
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- ГОТОВО!
-- =====================================================

SELECT 'RLS policy updated for finished_goods_warehouse!' AS message;
