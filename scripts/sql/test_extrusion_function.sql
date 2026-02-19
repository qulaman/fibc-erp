-- ТЕСТОВЫЙ ВЫЗОВ ФУНКЦИИ register_extrusion_output
-- Выполните в Supabase SQL Editor для проверки

-- 1. Получить ID машины (экструдера)
SELECT id, name, code FROM equipment WHERE type = 'extruder' LIMIT 1;

-- 2. Получить ID оператора экструдера
SELECT id, full_name FROM employees WHERE role = 'operator_extruder' AND is_active = true LIMIT 1;

-- 3. Получить ID намотчиков
SELECT id, full_name FROM employees WHERE role = 'operator_winder' AND is_active = true LIMIT 3;

-- 4. ТЕСТОВЫЙ ВЫЗОВ ФУНКЦИИ (замените UUID на реальные ID из запросов выше)
-- Пример:
/*
SELECT register_extrusion_output(
    p_date := '2025-02-09'::DATE,
    p_shift := 'День',
    p_machine_id := 'ВАШ-ID-МАШИНЫ'::UUID,
    p_operator_id := 'ВАШ-ID-ОПЕРАТОРА'::UUID,
    p_yarn_name := 'Нить ПП 1000D Белый (2.5мм)',
    p_yarn_denier := 1000,
    p_width_mm := 2.5,
    p_color := 'Белый',
    p_batch_number := 'TEST-250209-1',
    p_weight_kg := 100.0,
    p_operator_winder1 := 'ID-НАМОТЧИКА-1'::UUID,
    p_operator_winder2 := 'ID-НАМОТЧИКА-2'::UUID,
    p_operator_winder3 := NULL,
    p_notes := 'Тестовый вызов'
);
*/

-- 5. Проверить результат
SELECT * FROM production_extrusion
WHERE batch_number = 'TEST-250209-1'
ORDER BY created_at DESC LIMIT 1;

SELECT * FROM yarn_warehouse
WHERE batch_number = 'TEST-250209-1'
ORDER BY created_at DESC LIMIT 1;
