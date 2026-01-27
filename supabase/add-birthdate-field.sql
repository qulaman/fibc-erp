-- ═══════════════════════════════════════════════════════════════════════════
-- ДОБАВЛЕНИЕ ПОЛЯ ДАТЫ РОЖДЕНИЯ К СОТРУДНИКАМ
-- ═══════════════════════════════════════════════════════════════════════════

-- Добавляем поле birth_date к таблице employees
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- Добавляем комментарий
COMMENT ON COLUMN employees.birth_date IS 'Дата рождения сотрудника';

-- Создаем индекс для быстрого поиска по дате рождения
CREATE INDEX IF NOT EXISTS idx_employees_birth_date ON employees(birth_date);

-- Примеры данных (раскомментируйте и измените для тестирования)
-- UPDATE employees SET birth_date = '1985-01-25' WHERE full_name = 'Иванов Иван';
-- UPDATE employees SET birth_date = '1990-03-15' WHERE full_name = 'Петров Петр';
