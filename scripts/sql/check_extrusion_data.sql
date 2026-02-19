-- ПРОВЕРКА ДАННЫХ ЭКСТРУЗИИ
-- Выполните в Supabase SQL Editor

-- 1. Последние 10 записей в production_extrusion
SELECT
    id,
    doc_number,
    batch_number,
    date,
    shift,
    yarn_name,
    yarn_denier,
    yarn_width_mm,
    yarn_color,
    output_weight_net,
    operator_extruder_id,
    operator_winder1_id,
    operator_winder2_id,
    operator_winder3_id,
    created_at
FROM production_extrusion
ORDER BY created_at DESC
LIMIT 10;

-- 2. Проверка структуры таблицы (есть ли все нужные поля?)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'production_extrusion'
AND column_name IN (
    'operator_extruder_id',
    'operator_winder1_id',
    'operator_winder2_id',
    'operator_winder3_id',
    'yarn_width_mm',
    'yarn_color',
    'batch_number'
)
ORDER BY column_name;

-- 3. Проверка функции
SELECT
    routine_name,
    routine_type,
    (SELECT string_agg(parameter_name || ' ' || data_type, ', ' ORDER BY ordinal_position)
     FROM information_schema.parameters
     WHERE specific_name = r.specific_name
     AND parameter_mode = 'IN'
    ) as parameters
FROM information_schema.routines r
WHERE routine_name = 'register_extrusion_output';

-- 4. Проверка последних записей в yarn_warehouse
SELECT
    id,
    yarn_name,
    yarn_denier,
    batch_number,
    balance_kg,
    created_at
FROM yarn_warehouse
ORDER BY created_at DESC
LIMIT 10;
