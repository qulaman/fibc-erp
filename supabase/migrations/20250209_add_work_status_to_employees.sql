-- Добавление поля work_status в таблицу employees
-- Это поле будет хранить текущий статус работы сотрудника:
-- 'active' - активно работает
-- 'vacation' - в отпуске
-- 'sick_leave' - на больничном

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS work_status TEXT CHECK (work_status IN ('active', 'vacation', 'sick_leave'));

-- Установить значение по умолчанию 'active' для всех активных сотрудников
UPDATE employees
SET work_status = 'active'
WHERE is_active = TRUE AND work_status IS NULL;

-- Комментарий к колонке
COMMENT ON COLUMN employees.work_status IS 'Статус работы сотрудника: active, vacation, sick_leave';
