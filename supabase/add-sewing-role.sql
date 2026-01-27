-- ═══════════════════════════════════════════════════════════════════════════
-- ДОБАВЛЕНИЕ РОЛИ "operator_sewing" В ENUM employee_role
-- ═══════════════════════════════════════════════════════════════════════════

-- Вариант 1: Если поле role всё ещё ENUM - добавляем новое значение
ALTER TYPE employee_role ADD VALUE IF NOT EXISTS 'operator_sewing';

COMMENT ON TYPE employee_role IS 'Роли сотрудников: admin, manager_warehouse, operator_extruder, operator_winder, operator_weaver, operator_lamination, operator_cutting, operator_sewing';

-- Проверка
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'employee_role'::regtype
ORDER BY enumsortorder;
