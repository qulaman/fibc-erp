-- =====================================================
-- Исправление ссылки на спецификации строп
-- =====================================================
-- Проблема: strap_type_id был UUID для старой таблицы strap_types
-- Решение: Добавляем spec_name и делаем strap_type_id nullable

-- 1. Добавляем новую колонку для названия спецификации
-- Пробуем оба возможных имени таблицы
DO $$
BEGIN
    -- Для production_straps
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_straps') THEN
        ALTER TABLE production_straps ADD COLUMN IF NOT EXISTS spec_name VARCHAR(100);
        ALTER TABLE production_straps ALTER COLUMN strap_type_id DROP NOT NULL;
        COMMENT ON COLUMN production_straps.spec_name IS 'Название спецификации стропы из справочника strop_specifications';
        RAISE NOTICE 'Updated production_straps table';
    END IF;

    -- Для straps_warehouse
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'straps_warehouse') THEN
        ALTER TABLE straps_warehouse ADD COLUMN IF NOT EXISTS spec_name VARCHAR(100);
        ALTER TABLE straps_warehouse ALTER COLUMN strap_type_id DROP NOT NULL;
        COMMENT ON COLUMN straps_warehouse.spec_name IS 'Название спецификации стропы из справочника strop_specifications';
        RAISE NOTICE 'Updated straps_warehouse table';
    END IF;
END $$;

-- =====================================================
-- ГОТОВО!
-- =====================================================

SELECT 'Straps specification reference fixed!' AS message;
