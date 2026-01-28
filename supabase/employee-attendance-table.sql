-- ═══════════════════════════════════════════════════════════════════════════
-- ТАБЛИЦА ПОСЕЩАЕМОСТИ СОТРУДНИКОВ (ТАБЕЛЬ)
-- ═══════════════════════════════════════════════════════════════════════════
-- Для учета графика смен и рабочих часов сотрудников по всем цехам
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Создание таблицы
CREATE TABLE IF NOT EXISTS employee_attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'sick', 'vacation')),
  hours NUMERIC(5,2) NOT NULL CHECK (hours >= 0 AND hours <= 24),
  shift_type TEXT NOT NULL CHECK (shift_type IN ('Day', 'Night')),
  notes TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_employee_date UNIQUE(employee_id, date)
);

-- 2. Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON employee_attendance(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON employee_attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_shift ON employee_attendance(shift_type);
CREATE INDEX IF NOT EXISTS idx_attendance_created ON employee_attendance(created_at DESC);

-- 3. Комментарии
COMMENT ON TABLE employee_attendance IS 'Табель учета рабочего времени сотрудников';
COMMENT ON COLUMN employee_attendance.employee_id IS 'Ссылка на сотрудника';
COMMENT ON COLUMN employee_attendance.date IS 'Дата работы';
COMMENT ON COLUMN employee_attendance.status IS 'Статус: present, absent, sick, vacation';
COMMENT ON COLUMN employee_attendance.hours IS 'Количество отработанных часов (0-24)';
COMMENT ON COLUMN employee_attendance.shift_type IS 'Тип смены: Day (дневная) или Night (ночная)';
COMMENT ON COLUMN employee_attendance.notes IS 'Примечания к отметке';

-- 4. RLS политики (Row Level Security)
ALTER TABLE employee_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for authenticated users" ON employee_attendance;
CREATE POLICY "Enable all for authenticated users" ON employee_attendance
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- 5. Триггер для автообновления updated_at
DROP TRIGGER IF EXISTS update_employee_attendance_updated_at ON employee_attendance;

CREATE TRIGGER update_employee_attendance_updated_at
    BEFORE UPDATE ON employee_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════════════════════
-- ПРЕДСТАВЛЕНИЯ (VIEWS) ДЛЯ АНАЛИТИКИ
-- ═══════════════════════════════════════════════════════════════════════════

-- View 1: Сводка по сотрудникам за месяц
CREATE OR REPLACE VIEW view_monthly_attendance_summary AS
SELECT
    e.id AS employee_id,
    e.full_name,
    e.role,
    DATE_TRUNC('month', a.date) AS month,
    COUNT(*) AS days_worked,
    SUM(a.hours) AS total_hours,
    SUM(CASE WHEN a.shift_type = 'Day' THEN a.hours ELSE 0 END) AS day_hours,
    SUM(CASE WHEN a.shift_type = 'Night' THEN a.hours ELSE 0 END) AS night_hours,
    SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS days_present,
    SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS days_absent,
    SUM(CASE WHEN a.status = 'sick' THEN 1 ELSE 0 END) AS days_sick
FROM employees e
LEFT JOIN employee_attendance a ON e.id = a.employee_id
WHERE e.is_active = true
GROUP BY e.id, e.full_name, e.role, DATE_TRUNC('month', a.date)
ORDER BY e.full_name, month DESC;

COMMENT ON VIEW view_monthly_attendance_summary IS 'Месячная сводка посещаемости по сотрудникам';

-- View 2: Сводка по цехам за месяц
CREATE OR REPLACE VIEW view_department_attendance_summary AS
SELECT
    e.role AS department,
    DATE_TRUNC('month', a.date) AS month,
    COUNT(DISTINCT e.id) AS employees_count,
    COUNT(*) AS total_records,
    SUM(a.hours) AS total_hours,
    AVG(a.hours) AS avg_hours_per_shift
FROM employees e
LEFT JOIN employee_attendance a ON e.id = a.employee_id
WHERE e.is_active = true
GROUP BY e.role, DATE_TRUNC('month', a.date)
ORDER BY month DESC, department;

COMMENT ON VIEW view_department_attendance_summary IS 'Сводка посещаемости по цехам';

-- ═══════════════════════════════════════════════════════════════════════════
-- ТЕСТОВЫЕ ДАННЫЕ (ОПЦИОНАЛЬНО)
-- ═══════════════════════════════════════════════════════════════════════════
-- Раскомментируйте для добавления тестовых записей

-- Пример: Добавить записи за текущий месяц для первого активного сотрудника
-- INSERT INTO employee_attendance (employee_id, date, status, hours, shift_type)
-- SELECT
--     id,
--     CURRENT_DATE - (INTERVAL '1 day' * s),
--     'present',
--     12,
--     CASE WHEN RANDOM() > 0.5 THEN 'Day' ELSE 'Night' END
-- FROM employees, generate_series(0, 20) AS s
-- WHERE is_active = true
-- LIMIT 1
-- ON CONFLICT (employee_id, date) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- ПРОВЕРКА
-- ═══════════════════════════════════════════════════════════════════════════

-- Проверить создание таблицы
SELECT
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename = 'employee_attendance';

-- Проверить индексы
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'employee_attendance';

-- Проверить RLS политики
SELECT
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'employee_attendance';

-- Проверить представления
SELECT
    viewname,
    schemaname
FROM pg_views
WHERE viewname LIKE '%attendance%'
ORDER BY viewname;

-- ═══════════════════════════════════════════════════════════════════════════
-- ГОТОВО!
-- ═══════════════════════════════════════════════════════════════════════════
--
-- СЛЕДУЮЩИЕ ШАГИ:
-- 1. Запустите этот скрипт в Supabase SQL Editor
-- 2. Проверьте создание таблицы и views
-- 3. Откройте любую страницу табеля (например /production/extrusion/timesheet)
-- 4. Начните отмечать посещаемость сотрудников
--
-- ═══════════════════════════════════════════════════════════════════════════
