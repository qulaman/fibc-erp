-- ═══════════════════════════════════════════════════════════════════════════
-- ДОБАВЛЕНИЕ ОПЕРАЦИЙ ПОШИВА
-- ═══════════════════════════════════════════════════════════════════════════

-- Сначала проверяем, есть ли данные
SELECT COUNT(*) as existing_count FROM sewing_operations;

-- Удаляем все существующие данные (если есть)
DELETE FROM sewing_specifications;
DELETE FROM sewing_operations;

-- Добавляем операции заново
INSERT INTO sewing_operations (code, name, category, complexity, time_norm_minutes, rate_kzt, status) VALUES
('SEW-001', 'Пошив тела мешка', 'Основные', 3, 15.0, 150, 'Активно'),
('SEW-002', 'Пришивание клапана', 'Основные', 2, 8.0, 80, 'Активно'),
('SEW-003', 'Пришивание строп', 'Основные', 2, 10.0, 100, 'Активно'),
('SEW-004', 'Окантовка верха', 'Вспомогательные', 1, 5.0, 50, 'Активно'),
('SEW-005', 'Установка петель', 'Вспомогательные', 1, 3.0, 30, 'Активно');

-- Добавляем спецификации
INSERT INTO sewing_specifications (sewing_operation_code, cutting_part_code, cutting_part_name, quantity, status) VALUES
('SEW-001', 'DON-90-90', 'Донышко квадратное 90x90 см', 1, 'Активно'),
('SEW-001', 'BOK-180-90', 'Боковина 180x90 см', 4, 'Активно'),
('SEW-002', 'BOK-200-100', 'Боковина 200x100 см', 1, 'Активно'),
('SEW-003', 'PET-40-15', 'Петля 40см ширина 15мм', 4, 'Активно');

-- Проверяем результат
SELECT 'Операции пошива:' as table_name, COUNT(*) as count FROM sewing_operations
UNION ALL
SELECT 'Спецификации:', COUNT(*) FROM sewing_specifications;

-- Показываем все операции
SELECT code, name, category, rate_kzt, status FROM sewing_operations ORDER BY code;
