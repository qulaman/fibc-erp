-- ═══════════════════════════════════════════════════════════════════════════
-- МИГРАЦИЯ: Поддержка двух смен (день + ночь) на одну дату
-- ═══════════════════════════════════════════════════════════════════════════
-- Запустить в Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Удаляем старый UNIQUE constraint (employee_id, date)
ALTER TABLE employee_attendance
  DROP CONSTRAINT IF EXISTS unique_employee_date;

-- Добавляем новый UNIQUE constraint (employee_id, date, shift_type)
-- Теперь можно иметь 2 записи на одну дату: 'Day' и 'Night'
ALTER TABLE employee_attendance
  ADD CONSTRAINT unique_employee_date_shift UNIQUE (employee_id, date, shift_type);

-- Проверка
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'employee_attendance';
