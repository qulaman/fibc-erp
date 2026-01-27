-- ═══════════════════════════════════════════════════════════════════════════
-- МИГРАЦИЯ: Добавление колонки is_active в таблицу equipment
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Добавляем колонку is_active (по умолчанию TRUE для всех существующих)
ALTER TABLE equipment
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Обновляем все существующие записи (на всякий случай)
UPDATE equipment SET is_active = TRUE WHERE is_active IS NULL;

-- 3. Комментарий
COMMENT ON COLUMN equipment.is_active IS 'Активность оборудования (TRUE = активно, FALSE = выведено из эксплуатации)';

-- 4. Проверка
SELECT id, name, type, is_active FROM equipment LIMIT 10;
