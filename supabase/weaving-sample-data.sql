-- ═══════════════════════════════════════════════════════════════════════════
-- ТЕСТОВЫЕ ДАННЫЕ ДЛЯ МОДУЛЯ ТКАЧЕСТВА
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. СТАНКИ ТКАЧЕСТВА
-- Проверяем существование перед вставкой
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM equipment WHERE name = 'Ткацкий станок Sulzer #1') THEN
    INSERT INTO equipment (name, code, type, status)
    VALUES ('Ткацкий станок Sulzer #1', 'SULZ-01', 'weaving', 'Работает');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM equipment WHERE name = 'Ткацкий станок Sulzer #2') THEN
    INSERT INTO equipment (name, code, type, status)
    VALUES ('Ткацкий станок Sulzer #2', 'SULZ-02', 'weaving', 'Работает');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM equipment WHERE name = 'Ткацкий станок Dornier #1') THEN
    INSERT INTO equipment (name, code, type, status)
    VALUES ('Ткацкий станок Dornier #1', 'DORN-01', 'weaving', 'Работает');
  END IF;
END $$;

-- 2. СОТРУДНИКИ ТКАЧЕСТВА
-- Примечание: Используем роль 'operator_extruder' как базовую роль оператора
-- После создания вы можете обновить роли через UI
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM employees WHERE full_name = 'Сейтжанов Ерлан') THEN
    INSERT INTO employees (full_name, role, is_active)
    VALUES ('Сейтжанов Ерлан', 'operator_extruder', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM employees WHERE full_name = 'Нурланов Бакытжан') THEN
    INSERT INTO employees (full_name, role, is_active)
    VALUES ('Нурланов Бакытжан', 'operator_extruder', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM employees WHERE full_name = 'Айтбаева Гульнара') THEN
    INSERT INTO employees (full_name, role, is_active)
    VALUES ('Айтбаева Гульнара', 'operator_extruder', true);
  END IF;
END $$;

-- 3. ТИПЫ ТКАНЕЙ
-- Больше не создаем - используются данные из справочника спецификаций (tkan_specifications)
-- Убедитесь что таблица tkan_specifications создана и заполнена!

-- 4. ПРОВЕРКА УСТАНОВКИ
DO $$
DECLARE
  spec_count INTEGER;
  machine_count INTEGER;
  operator_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO spec_count FROM tkan_specifications;
  SELECT COUNT(*) INTO machine_count FROM equipment WHERE type = 'weaving' AND status = 'Работает';
  SELECT COUNT(*) INTO operator_count FROM employees WHERE full_name IN ('Сейтжанов Ерлан', 'Нурланов Бакытжан', 'Айтбаева Гульнара') AND is_active = true;

  RAISE NOTICE '✅ УСТАНОВКА ЗАВЕРШЕНА:';
  RAISE NOTICE '   Спецификаций тканей: %', spec_count;
  RAISE NOTICE '   Станков: %', machine_count;
  RAISE NOTICE '   Операторов: %', operator_count;

  IF spec_count = 0 THEN
    RAISE WARNING '⚠️ Нет спецификаций! Создайте таблицу tkan_specifications и заполните её данными';
  END IF;

  IF machine_count = 0 THEN
    RAISE WARNING '⚠️ Нет рабочих станков!';
  END IF;

  IF operator_count = 0 THEN
    RAISE WARNING '⚠️ Нет активных операторов!';
  END IF;
END $$;
