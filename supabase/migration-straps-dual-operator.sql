-- ═══════════════════════════════════════════════════════════════════════════
-- МИГРАЦИЯ: Поддержка 2 операторов на один отчёт Строп
-- ═══════════════════════════════════════════════════════════════════════════
-- Запустить в Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- Добавляем второго оператора в production_straps
ALTER TABLE production_straps
  ADD COLUMN IF NOT EXISTS operator_id_2 UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Добавляем второго оператора в straps_machine_sessions
ALTER TABLE straps_machine_sessions
  ADD COLUMN IF NOT EXISTS operator_id_2 UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Проверка
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('production_straps', 'straps_machine_sessions')
  AND column_name LIKE 'operator%'
ORDER BY table_name, column_name;
