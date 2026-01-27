-- ═══════════════════════════════════════════════════════════════════════════
-- МИГРАЦИЯ: Добавление роли "Оператор Ламинации" в ENUM employee_role
-- ═══════════════════════════════════════════════════════════════════════════

-- ВАЖНО: В PostgreSQL нельзя напрямую добавить значение в ENUM если тип используется.
-- Нужно использовать ALTER TYPE ... ADD VALUE

-- 1. Добавляем новое значение в ENUM
ALTER TYPE employee_role ADD VALUE IF NOT EXISTS 'operator_lamination';

-- 2. КОММЕНТАРИЙ
COMMENT ON TYPE employee_role IS 'Роли сотрудников: admin, manager_warehouse, operator_extruder, operator_winder, operator_weaver, operator_lamination, operator_cutting, operator_sewing';

-- 3. Проверка - покажет все доступные значения ENUM
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = 'employee_role'::regtype
ORDER BY enumsortorder;
