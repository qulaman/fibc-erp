-- ============================================
-- ПРОВЕРКА ИСПОЛЬЗОВАНИЯ ПАРТИИ НИТИ
-- Перед удалением партии нити из yarn_inventory
-- ============================================

-- 1. Укажите номер партии, которую хотите удалить
-- Замените '260122-1-EXT-01-2006b' на ваш номер партии
DO $$
DECLARE
    v_batch_number TEXT := '260122-1-EXT-01-2006b';
    v_yarn_id UUID;
    v_count INTEGER;
BEGIN
    -- Получаем ID партии
    SELECT id INTO v_yarn_id
    FROM yarn_inventory
    WHERE batch_number = v_batch_number;

    IF v_yarn_id IS NULL THEN
        RAISE NOTICE 'Партия % не найдена', v_batch_number;
        RETURN;
    END IF;

    RAISE NOTICE '=== ПРОВЕРКА ИСПОЛЬЗОВАНИЯ ПАРТИИ % ===', v_batch_number;
    RAISE NOTICE 'ID партии: %', v_yarn_id;
    RAISE NOTICE '';

    -- 2. Проверяем использование в ткацком производстве (основа)
    SELECT COUNT(*) INTO v_count
    FROM weaving_rolls
    WHERE warp_batch_id = v_yarn_id;

    IF v_count > 0 THEN
        RAISE NOTICE '⚠️  Партия используется в ОСНОВЕ % рулонов ткани', v_count;

        -- Показываем рулоны
        RAISE NOTICE 'Рулоны (основа):';
        FOR rec IN (
            SELECT roll_number, tkan_code, length_m, weight_kg
            FROM weaving_rolls
            WHERE warp_batch_id = v_yarn_id
            LIMIT 10
        ) LOOP
            RAISE NOTICE '  - Рулон: %, Ткань: %, Длина: % м, Вес: % кг',
                rec.roll_number, rec.tkan_code, rec.length_m, rec.weight_kg;
        END LOOP;
    END IF;

    -- 3. Проверяем использование в ткацком производстве (уток)
    SELECT COUNT(*) INTO v_count
    FROM weaving_rolls
    WHERE weft_batch_id = v_yarn_id;

    IF v_count > 0 THEN
        RAISE NOTICE '⚠️  Партия используется в УТКЕ % рулонов ткани', v_count;

        -- Показываем рулоны
        RAISE NOTICE 'Рулоны (уток):';
        FOR rec IN (
            SELECT roll_number, tkan_code, length_m, weight_kg
            FROM weaving_rolls
            WHERE weft_batch_id = v_yarn_id
            LIMIT 10
        ) LOOP
            RAISE NOTICE '  - Рулон: %, Ткань: %, Длина: % м, Вес: % кг',
                rec.roll_number, rec.tkan_code, rec.length_m, rec.weight_kg;
        END LOOP;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '=== ВАРИАНТЫ РЕШЕНИЯ ===';
    RAISE NOTICE '1. Удалить связанные рулоны ткани (если они ошибочные)';
    RAISE NOTICE '2. Обнулить ссылки на партию в рулонах (SET NULL)';
    RAISE NOTICE '3. Оставить партию на складе';
END $$;
