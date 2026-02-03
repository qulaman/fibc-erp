-- ═══════════════════════════════════════════════════════════════════
-- МИГРАЦИЯ: Добавление отслеживания локации для ламинированных рулонов
-- Дата: 2025-02-02
-- Описание: Добавляем поле location в laminated_rolls для отслеживания
--           местоположения рулонов (lamination, cutting, warehouse, used)
-- ═══════════════════════════════════════════════════════════════════

-- 1. Добавляем поле location в laminated_rolls
ALTER TABLE laminated_rolls
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'lamination'
CHECK (location IN ('lamination', 'cutting', 'warehouse', 'used'));

COMMENT ON COLUMN laminated_rolls.location IS
'Текущая локация ламинированного рулона: lamination (на складе ламинации), cutting (в кроечном цехе), warehouse (общий склад), used (использован полностью)';

-- Индексы для быстрого поиска по локации
CREATE INDEX IF NOT EXISTS idx_laminated_rolls_location ON laminated_rolls(location);
CREATE INDEX IF NOT EXISTS idx_laminated_rolls_location_status ON laminated_rolls(location, status);

-- 2. Обновляем существующие рулоны: устанавливаем location
UPDATE laminated_rolls
SET location = CASE
  WHEN status = 'used' THEN 'used'
  ELSE 'lamination'
END
WHERE location IS NULL;

-- 3. Функция: Взять ламинированный рулон в крой
CREATE OR REPLACE FUNCTION move_laminated_roll_to_cutting(
  p_roll_id UUID
) RETURNS JSON AS $$
DECLARE
  v_roll_record laminated_rolls%ROWTYPE;
BEGIN
  -- Проверяем существование и статус рулона
  SELECT * INTO v_roll_record
  FROM laminated_rolls
  WHERE id = p_roll_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ламинированный рулон не найден'
    );
  END IF;

  IF v_roll_record.status != 'available' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Рулон должен быть доступен (status = available)'
    );
  END IF;

  IF v_roll_record.location != 'lamination' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Рулон уже перемещён (' || v_roll_record.location || ')'
    );
  END IF;

  -- Перемещаем рулон в крой
  UPDATE laminated_rolls
  SET location = 'cutting'
  WHERE id = p_roll_id;

  RETURN json_build_object(
    'success', true,
    'roll_number', v_roll_record.roll_number,
    'message', 'Ламинированный рулон перемещён в кроечный цех'
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION move_laminated_roll_to_cutting IS
'Перемещает ламинированный рулон из склада ламинации в кроечный цех';

-- 4. Функция: Вернуть ламинированный рулон на склад
CREATE OR REPLACE FUNCTION return_laminated_roll_to_lamination(
  p_roll_id UUID
) RETURNS JSON AS $$
DECLARE
  v_roll_record laminated_rolls%ROWTYPE;
BEGIN
  SELECT * INTO v_roll_record
  FROM laminated_rolls
  WHERE id = p_roll_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Рулон не найден');
  END IF;

  IF v_roll_record.location != 'cutting' THEN
    RETURN json_build_object('success', false, 'error', 'Рулон не в кроечном цехе');
  END IF;

  UPDATE laminated_rolls
  SET location = 'lamination'
  WHERE id = p_roll_id;

  RETURN json_build_object('success', true, 'message', 'Рулон возвращён на склад ламинации');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION return_laminated_roll_to_lamination IS
'Возвращает ламинированный рулон из кроечного цеха обратно на склад ламинации';

-- ═══════════════════════════════════════════════════════════════════
-- КОНЕЦ МИГРАЦИИ
-- ═══════════════════════════════════════════════════════════════════
