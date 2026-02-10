-- Функция для регистрации выпуска продукции экструзии
-- Добавляет запись в производство и обновляет склад нити

CREATE OR REPLACE FUNCTION register_extrusion_output(
    p_date DATE,
    p_shift TEXT,
    p_machine_id UUID,
    p_operator_id UUID DEFAULT NULL,
    p_operator_winder1 UUID DEFAULT NULL,
    p_operator_winder2 UUID DEFAULT NULL,
    p_operator_winder3 UUID DEFAULT NULL,
    p_yarn_name TEXT,
    p_yarn_denier INTEGER,
    p_width_mm NUMERIC,
    p_color TEXT,
    p_batch_number TEXT,
    p_weight_kg NUMERIC,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_production_id UUID;
    v_yarn_warehouse_id UUID;
    v_current_balance NUMERIC;
BEGIN
    -- 1. Создаем запись в production_extrusion
    INSERT INTO production_extrusion (
        date,
        shift,
        machine_id,
        operator_id,
        operator_winder1,
        operator_winder2,
        operator_winder3,
        yarn_name,
        yarn_denier,
        width_mm,
        color,
        batch_number,
        output_weight_kg,
        notes,
        status
    ) VALUES (
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
        p_notes,
        'completed'
    )
    RETURNING id INTO v_production_id;

    -- 2. Добавляем на склад нити (yarn_warehouse)
    -- Проверяем, есть ли уже такая нить на складе
    SELECT id, balance_kg INTO v_yarn_warehouse_id, v_current_balance
    FROM yarn_warehouse
    WHERE yarn_name = p_yarn_name
      AND batch_number = p_batch_number
    LIMIT 1;

    IF v_yarn_warehouse_id IS NOT NULL THEN
        -- Обновляем существующую запись
        UPDATE yarn_warehouse
        SET balance_kg = balance_kg + p_weight_kg,
            updated_at = NOW()
        WHERE id = v_yarn_warehouse_id;
    ELSE
        -- Создаем новую запись на складе
        INSERT INTO yarn_warehouse (
            yarn_name,
            yarn_denier,
            width_mm,
            color,
            batch_number,
            balance_kg,
            unit
        ) VALUES (
            p_yarn_name,
            p_yarn_denier,
            p_width_mm,
            p_color,
            p_batch_number,
            p_weight_kg,
            'kg'
        )
        RETURNING id INTO v_yarn_warehouse_id;
    END IF;

    -- 3. Возвращаем результат
    RETURN json_build_object(
        'success', true,
        'production_id', v_production_id,
        'yarn_warehouse_id', v_yarn_warehouse_id,
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

-- Комментарий к функции
COMMENT ON FUNCTION register_extrusion_output IS 'Регистрирует выпуск продукции экструзии и добавляет нить на склад';
