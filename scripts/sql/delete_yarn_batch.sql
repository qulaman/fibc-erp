-- ============================================
-- БЕЗОПАСНОЕ УДАЛЕНИЕ ПАРТИИ НИТИ
-- Выберите один из вариантов ниже
-- ============================================

-- ВАРИАНТ 1: Обнулить ссылки в рулонах ткани (БЕЗОПАСНЫЙ)
-- Партия удаляется, но рулоны ткани остаются без указания партии нити
-- Используйте этот вариант, если рулоны ткани нужно сохранить

DO $$
DECLARE
    v_batch_number TEXT := '260122-1-EXT-01-2006b'; -- Замените на ваш номер
    v_yarn_id UUID;
BEGIN
    -- Получаем ID партии
    SELECT id INTO v_yarn_id
    FROM yarn_inventory
    WHERE batch_number = v_batch_number;

    IF v_yarn_id IS NULL THEN
        RAISE NOTICE '❌ Партия % не найдена', v_batch_number;
        RETURN;
    END IF;

    RAISE NOTICE '🔄 Обнуляем ссылки на партию в рулонах ткани...';

    -- Обнуляем ссылки в основе
    UPDATE weaving_rolls
    SET warp_batch_id = NULL
    WHERE warp_batch_id = v_yarn_id;

    -- Обнуляем ссылки в утке
    UPDATE weaving_rolls
    SET weft_batch_id = NULL
    WHERE weft_batch_id = v_yarn_id;

    RAISE NOTICE '✅ Ссылки обнулены';
    RAISE NOTICE '🗑️  Удаляем партию...';

    -- Удаляем партию
    DELETE FROM yarn_inventory WHERE id = v_yarn_id;

    RAISE NOTICE '✅ Партия % успешно удалена', v_batch_number;
END $$;


-- ============================================
-- ВАРИАНТ 2: Удалить партию вместе с рулонами (ОПАСНО!)
-- Удаляет и партию нити, и все связанные рулоны ткани
-- ИСПОЛЬЗУЙТЕ ОСТОРОЖНО! Это удалит данные производства ткани!
-- ============================================

/*
DO $$
DECLARE
    v_batch_number TEXT := '260122-1-EXT-01-2006b'; -- Замените на ваш номер
    v_yarn_id UUID;
    v_count INTEGER;
BEGIN
    -- Получаем ID партии
    SELECT id INTO v_yarn_id
    FROM yarn_inventory
    WHERE batch_number = v_batch_number;

    IF v_yarn_id IS NULL THEN
        RAISE NOTICE '❌ Партия % не найдена', v_batch_number;
        RETURN;
    END IF;

    -- Считаем связанные рулоны
    SELECT COUNT(*) INTO v_count
    FROM weaving_rolls
    WHERE warp_batch_id = v_yarn_id OR weft_batch_id = v_yarn_id;

    RAISE NOTICE '⚠️  ВНИМАНИЕ! Будет удалено % рулонов ткани!', v_count;
    RAISE NOTICE '🗑️  Удаляем рулоны ткани...';

    -- Удаляем рулоны
    DELETE FROM weaving_rolls
    WHERE warp_batch_id = v_yarn_id OR weft_batch_id = v_yarn_id;

    RAISE NOTICE '✅ Рулоны удалены';
    RAISE NOTICE '🗑️  Удаляем партию нити...';

    -- Удаляем партию
    DELETE FROM yarn_inventory WHERE id = v_yarn_id;

    RAISE NOTICE '✅ Партия % и связанные рулоны успешно удалены', v_batch_number;
END $$;
*/


-- ============================================
-- ВАРИАНТ 3: Просто посмотреть информацию
-- Не удаляет ничего, только показывает связи
-- ============================================

/*
SELECT
    yi.batch_number AS "Партия нити",
    yi.yarn_name AS "Название",
    yi.quantity_kg AS "Остаток (кг)",
    COUNT(DISTINCT wr1.id) AS "Рулонов (основа)",
    COUNT(DISTINCT wr2.id) AS "Рулонов (уток)"
FROM yarn_inventory yi
LEFT JOIN weaving_rolls wr1 ON wr1.warp_batch_id = yi.id
LEFT JOIN weaving_rolls wr2 ON wr2.weft_batch_id = yi.id
WHERE yi.batch_number = '260122-1-EXT-01-2006b'
GROUP BY yi.batch_number, yi.yarn_name, yi.quantity_kg;
*/
