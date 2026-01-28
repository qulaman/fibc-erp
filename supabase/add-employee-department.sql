-- =====================================================
-- Добавление поля department (цех) в таблицу employees
-- =====================================================

-- Проверяем, существует ли колонка department
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'employees'
        AND column_name = 'department'
    ) THEN
        -- Добавляем колонку department
        ALTER TABLE employees
        ADD COLUMN department VARCHAR(50);

        -- Добавляем комментарий
        COMMENT ON COLUMN employees.department IS 'Цех/подразделение: extrusion, weaving, lamination, straps, cutting, sewing, warehouse, admin, other';

        -- Создаём индекс для быстрого поиска по цеху
        CREATE INDEX idx_employees_department ON employees(department);

        RAISE NOTICE 'Колонка department успешно добавлена в таблицу employees';
    ELSE
        RAISE NOTICE 'Колонка department уже существует в таблице employees';
    END IF;
END $$;

-- =====================================================
-- Примеры обновления существующих сотрудников
-- =====================================================

-- Раскомментируйте и отредактируйте при необходимости:

-- UPDATE employees SET department = 'extrusion' WHERE role LIKE '%extrud%';
-- UPDATE employees SET department = 'weaving' WHERE role LIKE '%weav%';
-- UPDATE employees SET department = 'lamination' WHERE role LIKE '%lamin%';
-- UPDATE employees SET department = 'straps' WHERE role LIKE '%strap%';
-- UPDATE employees SET department = 'cutting' WHERE role LIKE '%cutting%';
-- UPDATE employees SET department = 'sewing' WHERE role LIKE '%sewing%' OR role LIKE '%швея%';
-- UPDATE employees SET department = 'warehouse' WHERE role LIKE '%warehouse%' OR role LIKE '%склад%';
-- UPDATE employees SET department = 'admin' WHERE role = 'admin';
