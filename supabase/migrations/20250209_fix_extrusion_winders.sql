-- ============================================
-- ИСПРАВЛЕНИЕ МОДУЛЯ ЭКСТРУЗИИ
-- 1. Добавление третьего намотчика
-- 2. Обновление функции register_extrusion_output
-- ============================================

-- Шаг 1: Добавить колонку для третьего намотчика
ALTER TABLE production_extrusion
ADD COLUMN IF NOT EXISTS operator_winder3_id UUID REFERENCES employees(id);

COMMENT ON COLUMN production_extrusion.operator_winder3_id IS 'ID третьего намотчика';

-- Шаг 2: Пересоздать функцию с правильными параметрами
DROP FUNCTION IF EXISTS register_extrusion_output(date, text, uuid, uuid, text, integer, numeric, text, text, numeric, text);

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
    p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
    v_production_id UUID;
    v_yarn_warehouse_id UUID;
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
        p_notes
    )
    RETURNING id INTO v_production_id;

    -- Добавление на склад нити (yarn_warehouse)
    -- Проверяем, есть ли уже такая партия
    SELECT id INTO v_yarn_warehouse_id
    FROM yarn_warehouse
    WHERE batch_number = p_batch_number
    LIMIT 1;

    IF v_yarn_warehouse_id IS NOT NULL THEN
        -- Обновляем существующую запись
        UPDATE yarn_warehouse
        SET balance_kg = balance_kg + p_weight_kg,
            updated_at = NOW()
        WHERE id = v_yarn_warehouse_id;
    ELSE
        -- Создаем новую запись
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

    -- Возвращаем результат
    RETURN json_build_object(
        'success', true,
        'production_id', v_production_id,
        'yarn_warehouse_id', v_yarn_warehouse_id,
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

COMMENT ON FUNCTION register_extrusion_output IS 'Регистрирует выпуск партии экструзии с поддержкой трех намотчиков';

-- Шаг 3: Индекс для ускорения поиска
CREATE INDEX IF NOT EXISTS idx_production_extrusion_winder3
ON production_extrusion(operator_winder3_id);
