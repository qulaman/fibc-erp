-- ============================================
-- ИСПРАВЛЕНИЕ ФУНКЦИИ register_extrusion_output
-- Использовать yarn_inventory вместо yarn_warehouse
-- ============================================

-- Удаляем старую версию функции
DROP FUNCTION IF EXISTS register_extrusion_output(DATE, TEXT, UUID, UUID, TEXT, INTEGER, NUMERIC, TEXT, TEXT, NUMERIC, UUID, UUID, UUID, TEXT);

-- Создаем новую версию с дополнительными параметрами
CREATE OR REPLACE FUNCTION register_extrusion_output(
    p_date DATE,
    p_shift TEXT,
    p_machine_id UUID,
    p_operator_id UUID,
    p_yarn_name TEXT,
    p_yarn_denier INTEGER,
    p_width_mm NUMERIC,
    p_color TEXT,
    p_batch_number TEXT,
    p_weight_kg NUMERIC,
    p_operator_winder1 UUID DEFAULT NULL,
    p_operator_winder2 UUID DEFAULT NULL,
    p_operator_winder3 UUID DEFAULT NULL,
    p_dosators_data JSONB DEFAULT NULL,
    p_output_bobbins INTEGER DEFAULT 0,
    p_waste_weight NUMERIC DEFAULT 0,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_production_id UUID;
    v_yarn_inventory_id UUID;
    v_doc_number TEXT;
BEGIN
    -- Генерация номера документа
    v_doc_number := 'EXT-' || TO_CHAR(p_date, 'YYMMDD') || '-' ||
                    LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');

    -- Вставка записи в production_extrusion
    INSERT INTO production_extrusion (
        doc_number,
        date,
        shift,
        machine_id,
        operator_extruder_id,
        operator_winder1_id,
        operator_winder2_id,
        operator_winder3_id,
        yarn_name,
        yarn_denier,
        yarn_width_mm,
        yarn_color,
        batch_number,
        output_weight_net,
        dosators_data,
        output_bobbins,
        waste_weight,
        notes
    ) VALUES (
        v_doc_number,
        p_date,
        p_shift,
        p_machine_id,
        p_operator_id,
        p_operator_winder1,
        p_operator_winder2,
        p_operator_winder3,
        p_yarn_name,
        p_yarn_denier,
        p_width_mm,
        p_color,
        p_batch_number,
        p_weight_kg,
        p_dosators_data,
        p_output_bobbins,
        p_waste_weight,
        p_notes
    )
    RETURNING id INTO v_production_id;

    -- Списание сырья с дозаторов (inventory_transactions)
    IF p_dosators_data IS NOT NULL AND jsonb_array_length(p_dosators_data) > 0 THEN
        -- Для каждого дозатора создаем транзакцию расхода сырья
        FOR i IN 0..jsonb_array_length(p_dosators_data) - 1 LOOP
            DECLARE
                v_dosator JSONB := p_dosators_data->i;
                v_material_id UUID := (v_dosator->>'material_id')::UUID;
                v_weight NUMERIC := (v_dosator->>'weight')::NUMERIC;
                v_batch TEXT := v_dosator->>'batch';
            BEGIN
                -- Только если указан material_id и вес больше 0
                IF v_material_id IS NOT NULL AND v_weight > 0 THEN
                    INSERT INTO inventory_transactions (
                        type,
                        doc_number,
                        material_id,
                        quantity,
                        batch_number,
                        counterparty,
                        notes
                    ) VALUES (
                        'out',
                        v_doc_number,
                        v_material_id,
                        v_weight,
                        v_batch,
                        'Цех экструзии',
                        'Партия нити: ' || p_batch_number
                    );
                END IF;
            END;
        END LOOP;
    END IF;

    -- Добавление на склад нити (yarn_inventory)
    -- Проверяем, есть ли уже такая партия
    SELECT id INTO v_yarn_inventory_id
    FROM yarn_inventory
    WHERE batch_number = p_batch_number
    LIMIT 1;

    IF v_yarn_inventory_id IS NOT NULL THEN
        -- Обновляем существующую запись
        UPDATE yarn_inventory
        SET quantity_kg = quantity_kg + p_weight_kg,
            quantity = quantity + p_weight_kg,
            yarn_name = p_yarn_name,
            yarn_denier = p_yarn_denier,
            denier = p_yarn_denier,
            width_mm = p_width_mm,
            color = p_color,
            last_updated = NOW()
        WHERE id = v_yarn_inventory_id;
    ELSE
        -- Создаем новую запись
        INSERT INTO yarn_inventory (
            yarn_name,
            yarn_denier,
            denier,
            width_mm,
            color,
            batch_number,
            quantity_kg,
            quantity,
            location
        ) VALUES (
            p_yarn_name,
            p_yarn_denier,
            p_yarn_denier,  -- дублируем в denier
            p_width_mm,
            p_color,
            p_batch_number,
            p_weight_kg,
            p_weight_kg,     -- дублируем в quantity
            'Склад нити'
        )
        RETURNING id INTO v_yarn_inventory_id;
    END IF;

    -- Возвращаем результат
    RETURN json_build_object(
        'success', true,
        'production_id', v_production_id,
        'yarn_inventory_id', v_yarn_inventory_id,
        'doc_number', v_doc_number,
        'message', 'Партия успешно зарегистрирована'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Ошибка при регистрации партии'
        );
END;
$$;

COMMENT ON FUNCTION register_extrusion_output IS 'Регистрация выпуска нити с экструзии и добавление на склад (yarn_inventory)';
