-- ═══════════════════════════════════════════════════════════════════════════
-- МИГРАЦИЯ: Изменение типа поля role с ENUM на VARCHAR
-- ═══════════════════════════════════════════════════════════════════════════

-- Это позволит добавлять новые роли без миграций БД

-- 1. Изменяем тип колонки role на VARCHAR
ALTER TABLE employees
  ALTER COLUMN role TYPE VARCHAR(100) USING role::text;

-- 2. Удаляем старый ENUM (опционально, если он больше не используется)
-- DROP TYPE IF EXISTS employee_role;

-- 3. КОММЕНТАРИЙ
COMMENT ON COLUMN employees.role IS 'Роль сотрудника (свободный текст): admin, manager_warehouse, operator_extruder, operator_winder, operator_weaver, operator_lamination, operator_cutting, operator_sewing';

-- 4. Проверка
SELECT full_name, role FROM employees LIMIT 10;
