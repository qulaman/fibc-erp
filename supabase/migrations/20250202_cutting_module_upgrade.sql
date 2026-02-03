-- ═══════════════════════════════════════════════════════════════════
-- МИГРАЦИЯ: ПЕРЕРАБОТКА МОДУЛЯ КРОЯ
-- Дата: 2025-02-02
-- Описание: Добавление системы отслеживания локации рулонов,
--           поддержка произвольных размеров кроя,
--           связывание оператора с employees
-- ═══════════════════════════════════════════════════════════════════

-- 1. Добавляем поле location в weaving_rolls для отслеживания местоположения рулонов
ALTER TABLE weaving_rolls
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'weaving'
CHECK (location IN ('weaving', 'lamination', 'cutting', 'warehouse', 'used'));

COMMENT ON COLUMN weaving_rolls.location IS
'Текущая локация рулона: weaving (на станке/складе ткачества), lamination (в ламинации), cutting (в кроечном цехе), warehouse (общий склад), used (использован полностью)';

-- Индексы для быстрого поиска рулонов по локации
CREATE INDEX IF NOT EXISTS idx_weaving_rolls_location ON weaving_rolls(location);
CREATE INDEX IF NOT EXISTS idx_weaving_rolls_location_status ON weaving_rolls(location, status);

-- 2. Добавляем поле operator_id в production_cutting (UUID вместо TEXT)
ALTER TABLE production_cutting
ADD COLUMN IF NOT EXISTS operator_id UUID REFERENCES employees(id);

COMMENT ON COLUMN production_cutting.operator_id IS
'ID оператора кроя из таблицы employees (новое поле, заменяет operator TEXT)';

-- 3. Создаём таблицу для пользовательских размеров кроя
CREATE TABLE IF NOT EXISTS custom_cutting_sizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Связь с документом производства
  production_cutting_id UUID REFERENCES production_cutting(id) ON DELETE CASCADE,

  -- Пользовательские размеры
  width_cm NUMERIC(10,2),
  length_cm NUMERIC(10,2),
  consumption_cm NUMERIC(10,2) NOT NULL,

  -- Метаданные
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE custom_cutting_sizes IS
'Произвольные размеры кроя, не из справочника cutting_types';

CREATE INDEX IF NOT EXISTS idx_custom_cutting_production ON custom_cutting_sizes(production_cutting_id);

-- 4. Добавляем поле is_custom_size в production_cutting
ALTER TABLE production_cutting
ADD COLUMN IF NOT EXISTS is_custom_size BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN production_cutting.is_custom_size IS
'TRUE = размеры введены вручную (см. custom_cutting_sizes), FALSE = из справочника cutting_types';

-- 5. Добавляем поле roll_id в production_cutting (UUID вместо roll_number TEXT)
ALTER TABLE production_cutting
ADD COLUMN IF NOT EXISTS roll_id UUID REFERENCES weaving_rolls(id);

COMMENT ON COLUMN production_cutting.roll_id IS
'Ссылка на рулон (weaving_rolls.id). Новое поле для прямой связи с рулоном';

-- 6. Обновляем существующие рулоны: устанавливаем location
UPDATE weaving_rolls
SET location = CASE
  WHEN status = 'used' THEN 'used'
  ELSE 'weaving'
END
WHERE location IS NULL;

-- 7. Представление: Рулоны в кроечном цехе
CREATE OR REPLACE VIEW cutting_rolls_available AS
SELECT
  wr.id,
  wr.roll_number,
  wr.total_length as balance_m,
  wr.total_weight as balance_kg,
  wr.status,
  wr.location,
  wr.created_at,
  ts.kod_tkani as fabric_code,
  ts.nazvanie_tkani as fabric_name,
  ts.shirina_polotna_sm as fabric_width_cm
FROM weaving_rolls wr
LEFT JOIN tkan_specifications ts ON wr.fabric_spec_id = ts.id
WHERE wr.location = 'cutting'
  AND wr.status IN ('completed', 'active')
  AND wr.total_length > 0
ORDER BY wr.created_at DESC;

COMMENT ON VIEW cutting_rolls_available IS
'Рулоны, находящиеся в кроечном цехе и доступные для работы';

-- 8. Функция: Взять рулон в крой
CREATE OR REPLACE FUNCTION move_roll_to_cutting(
  p_roll_id UUID
) RETURNS JSON AS $$
DECLARE
  v_roll_record weaving_rolls%ROWTYPE;
BEGIN
  -- Проверяем существование и статус рулона
  SELECT * INTO v_roll_record
  FROM weaving_rolls
  WHERE id = p_roll_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Рулон не найден'
    );
  END IF;

  IF v_roll_record.status != 'completed' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Рулон должен быть завершён (status = completed)'
    );
  END IF;

  IF v_roll_record.location != 'weaving' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Рулон уже перемещён (' || v_roll_record.location || ')'
    );
  END IF;

  -- Перемещаем рулон в крой
  UPDATE weaving_rolls
  SET location = 'cutting'
  WHERE id = p_roll_id;

  RETURN json_build_object(
    'success', true,
    'roll_number', v_roll_record.roll_number,
    'message', 'Рулон перемещён в кроечный цех'
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION move_roll_to_cutting IS
'Перемещает рулон из ткачества в кроечный цех. Проверяет статус и локацию.';

-- 9. Функция: Вернуть рулон на склад ткачества (если не использован)
CREATE OR REPLACE FUNCTION return_roll_to_weaving(
  p_roll_id UUID
) RETURNS JSON AS $$
DECLARE
  v_roll_record weaving_rolls%ROWTYPE;
BEGIN
  SELECT * INTO v_roll_record
  FROM weaving_rolls
  WHERE id = p_roll_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Рулон не найден');
  END IF;

  IF v_roll_record.location != 'cutting' THEN
    RETURN json_build_object('success', false, 'error', 'Рулон не в кроечном цехе');
  END IF;

  UPDATE weaving_rolls
  SET location = 'weaving'
  WHERE id = p_roll_id;

  RETURN json_build_object('success', true, 'message', 'Рулон возвращён на склад ткачества');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION return_roll_to_weaving IS
'Возвращает рулон из кроечного цеха обратно на склад ткачества';

-- ═══════════════════════════════════════════════════════════════════
-- КОНЕЦ МИГРАЦИИ
-- ═══════════════════════════════════════════════════════════════════
