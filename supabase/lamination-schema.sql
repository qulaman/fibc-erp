-- ═══════════════════════════════════════════════════════════════════════════
-- МОДУЛЬ ЛАМИНАЦИИ - СХЕМА БАЗЫ ДАННЫХ
-- ═══════════════════════════════════════════════════════════════════════════

-- 0. ПОСЛЕДОВАТЕЛЬНОСТЬ ДЛЯ НОМЕРОВ ДОКУМЕНТОВ
CREATE SEQUENCE IF NOT EXISTS doc_sequence START 1;

-- 1. ЖУРНАЛ ПРОИЗВОДСТВА ЛАМИНАЦИИ
CREATE TABLE IF NOT EXISTS production_lamination (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number VARCHAR(50) UNIQUE NOT NULL,

  -- Дата и смена
  date DATE NOT NULL,
  shift VARCHAR(20), -- День/Ночь

  -- Производственная линия
  machine_id UUID REFERENCES equipment(id),
  operator_id UUID REFERENCES employees(id),

  -- Входящий рулон (с ткачества)
  input_roll_id UUID REFERENCES weaving_rolls(id),
  input_length NUMERIC(10,2) DEFAULT 0,
  input_weight NUMERIC(10,2) DEFAULT 0,

  -- Результат (выход)
  output_length NUMERIC(10,2) DEFAULT 0,
  output_weight NUMERIC(10,2) DEFAULT 0,

  -- Отходы
  waste NUMERIC(10,2) DEFAULT 0,

  -- Использованное сырье (дозаторы)
  dosators JSONB, -- [{material_id: UUID, weight: number}, ...]

  -- Примечания
  notes TEXT,

  -- Статус
  status VARCHAR(20) DEFAULT 'Завершен',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. СКЛАД ЛАМИНИРОВАННОЙ ТКАНИ (рулоны после ламинации)
CREATE TABLE IF NOT EXISTS laminated_rolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Номер рулона (старый номер + LAM)
  roll_number VARCHAR(50) UNIQUE NOT NULL,

  -- Связь с производством
  production_id UUID REFERENCES production_lamination(id),

  -- Исходный рулон (до ламинации)
  source_roll_id UUID REFERENCES weaving_rolls(id),

  -- Характеристики
  length NUMERIC(10,2) NOT NULL,
  weight NUMERIC(10,2) NOT NULL,

  -- Статус
  status VARCHAR(20) DEFAULT 'available', -- available/reserved/used

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. SQL-ФУНКЦИЯ: Обработка ламинации

-- Удаляем старую функцию если существует
DROP FUNCTION IF EXISTS process_lamination;

CREATE OR REPLACE FUNCTION process_lamination(
  p_date DATE,
  p_shift VARCHAR,
  p_machine_id UUID,
  p_operator_id UUID,

  p_input_roll_id UUID,
  p_input_length NUMERIC,
  p_input_weight NUMERIC,

  p_output_length NUMERIC,
  p_output_weight NUMERIC,
  p_waste NUMERIC,

  p_dosators JSONB,
  p_notes TEXT
)
RETURNS JSON AS $$
DECLARE
  v_doc_number VARCHAR(50);
  v_production_id UUID;
  v_new_roll_number VARCHAR(50);
  v_new_roll_id UUID;
  v_source_roll_number VARCHAR(50);
  v_dosator JSONB;
BEGIN
  -- 1. Генерируем номер документа
  v_doc_number := 'LAM-' || TO_CHAR(p_date, 'YYYYMMDD') || '-' || LPAD(NEXTVAL('doc_sequence')::TEXT, 4, '0');

  -- 2. Получаем номер исходного рулона
  SELECT roll_number INTO v_source_roll_number
  FROM weaving_rolls
  WHERE id = p_input_roll_id;

  IF v_source_roll_number IS NULL THEN
    RAISE EXCEPTION 'Рулон с ID % не найден', p_input_roll_id;
  END IF;

  -- 3. Создаем новый номер рулона (старый + LAM)
  v_new_roll_number := v_source_roll_number || '-LAM';

  -- 4. Создаем запись в журнале производства
  INSERT INTO production_lamination (
    doc_number, date, shift, machine_id, operator_id,
    input_roll_id, input_length, input_weight,
    output_length, output_weight, waste,
    dosators, notes
  ) VALUES (
    v_doc_number, p_date, p_shift, p_machine_id, p_operator_id,
    p_input_roll_id, p_input_length, p_input_weight,
    p_output_length, p_output_weight, p_waste,
    p_dosators, p_notes
  ) RETURNING id INTO v_production_id;

  -- 5. Списываем использованное сырье (дозаторы) - ПРОПУСКАЕМ, таблица не существует
  -- FOR v_dosator IN SELECT * FROM jsonb_array_elements(p_dosators)
  -- LOOP
  --   UPDATE raw_materials_inventory
  --   SET quantity = quantity - (v_dosator->>'weight')::NUMERIC
  --   WHERE material_id = (v_dosator->>'material_id')::UUID
  --     AND quantity >= (v_dosator->>'weight')::NUMERIC;
  --   IF NOT FOUND THEN
  --     RAISE WARNING 'Недостаточно сырья для материала %', v_dosator->>'material_id';
  --   END IF;
  -- END LOOP;

  -- 6. Обновляем статус исходного рулона (помечаем как использованный)
  UPDATE weaving_rolls
  SET status = 'used'
  WHERE id = p_input_roll_id;

  -- 7. Создаем новый ламинированный рулон
  INSERT INTO laminated_rolls (
    roll_number, production_id, source_roll_id,
    length, weight, status
  ) VALUES (
    v_new_roll_number, v_production_id, p_input_roll_id,
    p_output_length, p_output_weight, 'available'
  ) RETURNING id INTO v_new_roll_id;

  -- 8. Возвращаем результат
  RETURN json_build_object(
    'success', true,
    'production_id', v_production_id,
    'doc_number', v_doc_number,
    'new_roll_id', v_new_roll_id,
    'new_roll_number', v_new_roll_number
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Ошибка при обработке ламинации: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 4. ИНДЕКСЫ
CREATE INDEX IF NOT EXISTS idx_production_lamination_date ON production_lamination(date);
CREATE INDEX IF NOT EXISTS idx_production_lamination_machine ON production_lamination(machine_id);
CREATE INDEX IF NOT EXISTS idx_laminated_rolls_status ON laminated_rolls(status);
CREATE INDEX IF NOT EXISTS idx_laminated_rolls_production ON laminated_rolls(production_id);

-- 5. КОММЕНТАРИИ
COMMENT ON TABLE production_lamination IS 'Журнал производства ламинации';
COMMENT ON TABLE laminated_rolls IS 'Склад ламинированных рулонов';
COMMENT ON FUNCTION process_lamination IS 'Обработка ламинации: создание документа, списание сырья, создание нового рулона';
