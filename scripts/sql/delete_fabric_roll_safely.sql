-- ============================================
-- БЕЗОПАСНОЕ УДАЛЕНИЕ РУЛОНА ТКАНИ
-- ============================================

-- ВАРИАНТ 1: Только просмотр связей (БЕЗОПАСНЫЙ - ничего не удаляет)
-- Показывает где используется рулон
-- ============================================

DO $$
DECLARE
    v_roll_number TEXT := 'R-250209-L-123'; -- Замените на номер вашего рулона
    v_roll_id UUID;
    v_count INTEGER;
BEGIN
    -- Получаем ID рулона
    SELECT id INTO v_roll_id
    FROM weaving_rolls
    WHERE roll_number = v_roll_number;

    IF v_roll_id IS NULL THEN
        RAISE NOTICE '❌ Рулон % не найден', v_roll_number;
        RETURN;
    END IF;

    RAISE NOTICE '====================================';
    RAISE NOTICE '📊 СВЯЗИ РУЛОНА: %', v_roll_number;
    RAISE NOTICE '====================================';
    RAISE NOTICE '';

    -- 1. Производство ткачества
    SELECT COUNT(*) INTO v_count
    FROM production_weaving
    WHERE roll_id = v_roll_id;

    IF v_count > 0 THEN
        RAISE NOTICE '🏭 Производство ткачества: % записей', v_count;
    ELSE
        RAISE NOTICE '✅ Производство ткачества: нет связей';
    END IF;

    -- 2. Производство ламинации
    SELECT COUNT(*) INTO v_count
    FROM production_lamination
    WHERE input_roll_id = v_roll_id;

    IF v_count > 0 THEN
        RAISE NOTICE '🔶 Производство ламинации: % записей', v_count;
    ELSE
        RAISE NOTICE '✅ Производство ламинации: нет связей';
    END IF;

    -- 3. Ламинированные рулоны
    SELECT COUNT(*) INTO v_count
    FROM laminated_rolls
    WHERE source_roll_id = v_roll_id;

    IF v_count > 0 THEN
        RAISE NOTICE '📦 Ламинированные рулоны: % штук', v_count;
    ELSE
        RAISE NOTICE '✅ Ламинированные рулоны: нет связей';
    END IF;

    -- 4. Производство кроя
    SELECT COUNT(*) INTO v_count
    FROM production_cutting
    WHERE roll_id = v_roll_id;

    IF v_count > 0 THEN
        RAISE NOTICE '✂️ Производство кроя: % записей', v_count;
    ELSE
        RAISE NOTICE '✅ Производство кроя: нет связей';
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '====================================';
END $$;


-- ============================================
-- ВАРИАНТ 2: Обнулить ссылки (ОСТОРОЖНО!)
-- Удаляет рулон, обнуляя ссылки на него
-- ============================================

/*
DO $$
DECLARE
    v_roll_number TEXT := 'R-250209-L-123'; -- Замените на номер вашего рулона
    v_roll_id UUID;
BEGIN
    -- Получаем ID рулона
    SELECT id INTO v_roll_id
    FROM weaving_rolls
    WHERE roll_number = v_roll_number;

    IF v_roll_id IS NULL THEN
        RAISE NOTICE '❌ Рулон % не найден', v_roll_number;
        RETURN;
    END IF;

    RAISE NOTICE '🔄 Обнуляем ссылки на рулон %...', v_roll_number;

    -- Обнуляем в производстве ткачества
    UPDATE production_weaving
    SET roll_id = NULL
    WHERE roll_id = v_roll_id;

    -- Обнуляем в производстве ламинации
    UPDATE production_lamination
    SET input_roll_id = NULL
    WHERE input_roll_id = v_roll_id;

    -- Обнуляем в ламинированных рулонах
    UPDATE laminated_rolls
    SET source_roll_id = NULL
    WHERE source_roll_id = v_roll_id;

    -- Обнуляем в производстве кроя
    UPDATE production_cutting
    SET roll_id = NULL
    WHERE roll_id = v_roll_id;

    RAISE NOTICE '✅ Ссылки обнулены';
    RAISE NOTICE '🗑️ Удаляем рулон...';

    -- Удаляем рулон
    DELETE FROM weaving_rolls WHERE id = v_roll_id;

    RAISE NOTICE '✅ Рулон % успешно удален', v_roll_number;
END $$;
*/


-- ============================================
-- ВАРИАНТ 3: Каскадное удаление (ОПАСНО!)
-- Удаляет рулон и ВСЕ связанные записи
-- ИСПОЛЬЗУЙТЕ ОЧЕНЬ ОСТОРОЖНО!
-- ============================================

/*
DO $$
DECLARE
    v_roll_number TEXT := 'R-250209-L-123'; -- Замените на номер вашего рулона
    v_roll_id UUID;
    v_count_weaving INTEGER;
    v_count_lamination INTEGER;
    v_count_laminated INTEGER;
    v_count_cutting INTEGER;
BEGIN
    -- Получаем ID рулона
    SELECT id INTO v_roll_id
    FROM weaving_rolls
    WHERE roll_number = v_roll_number;

    IF v_roll_id IS NULL THEN
        RAISE NOTICE '❌ Рулон % не найден', v_roll_number;
        RETURN;
    END IF;

    -- Считаем что будет удалено
    SELECT COUNT(*) INTO v_count_weaving FROM production_weaving WHERE roll_id = v_roll_id;
    SELECT COUNT(*) INTO v_count_lamination FROM production_lamination WHERE input_roll_id = v_roll_id;
    SELECT COUNT(*) INTO v_count_laminated FROM laminated_rolls WHERE source_roll_id = v_roll_id;
    SELECT COUNT(*) INTO v_count_cutting FROM production_cutting WHERE roll_id = v_roll_id;

    RAISE NOTICE '⚠️⚠️⚠️ ВНИМАНИЕ! БУДЕТ УДАЛЕНО: ⚠️⚠️⚠️';
    RAISE NOTICE '  - Рулон: %', v_roll_number;
    RAISE NOTICE '  - Записи ткачества: %', v_count_weaving;
    RAISE NOTICE '  - Записи ламинации: %', v_count_lamination;
    RAISE NOTICE '  - Ламинированные рулоны: %', v_count_laminated;
    RAISE NOTICE '  - Записи кроя: %', v_count_cutting;
    RAISE NOTICE '';

    -- Удаляем связанные записи
    RAISE NOTICE '🗑️ Удаляем связанные записи...';

    DELETE FROM production_weaving WHERE roll_id = v_roll_id;
    RAISE NOTICE '  ✅ Удалены записи ткачества';

    DELETE FROM production_lamination WHERE input_roll_id = v_roll_id;
    RAISE NOTICE '  ✅ Удалены записи ламинации';

    DELETE FROM laminated_rolls WHERE source_roll_id = v_roll_id;
    RAISE NOTICE '  ✅ Удалены ламинированные рулоны';

    DELETE FROM production_cutting WHERE roll_id = v_roll_id;
    RAISE NOTICE '  ✅ Удалены записи кроя';

    -- Удаляем рулон
    DELETE FROM weaving_rolls WHERE id = v_roll_id;
    RAISE NOTICE '  ✅ Удален рулон %', v_roll_number;

    RAISE NOTICE '';
    RAISE NOTICE '✅ Операция завершена успешно';
END $$;
*/


-- ============================================
-- Как использовать:
-- ============================================

-- 1. Откройте Supabase SQL Editor
-- 2. Замените 'R-250209-L-123' на номер вашего рулона
-- 3. Запустите ВАРИАНТ 1 чтобы посмотреть связи
-- 4. Если нужно удалить - раскомментируйте и запустите ВАРИАНТ 2 или 3
--    (удалите /* и */ вокруг нужного варианта)
