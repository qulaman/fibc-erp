-- ============================================================================
-- ПЕРЕРАБОТКА МОДУЛЯ ЛАМИНАЦИИ ПОД ПАКЕТНУЮ ОБРАБОТКУ
-- ============================================================================
-- Описание: Модуль ламинации работает по принципу СМЕНА → НЕСКОЛЬКО РУЛОНОВ
-- За одну смену команда из 3 операторов обрабатывает множество рулонов

-- ============================================================================
-- 1. ТАБЛИЦА СМЕН ЛАМИНАЦИИ (Parent)
-- ============================================================================
CREATE TABLE IF NOT EXISTS production_lamination_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number TEXT UNIQUE NOT NULL,
  date DATE DEFAULT CURRENT_DATE,
  shift TEXT CHECK (shift IN ('День', 'Ночь')),

  -- Оборудование
  machine_id UUID REFERENCES equipment(id),

  -- Команда операторов (3 человека)
  operator1_id UUID REFERENCES employees(id),
  operator2_id UUID REFERENCES employees(id),
  operator3_id UUID REFERENCES employees(id),

  -- Дозаторы сырья (общие на всю смену) - JSON массив
  dosators JSONB DEFAULT '[]'::jsonb,

  -- Отходы (общие на всю смену)
  waste_oploy_kg NUMERIC(10,2) DEFAULT 0,      -- Оплой (пленка с головы ламинатора)
  waste_shift_kg NUMERIC(10,2) DEFAULT 0,      -- Общий отход за смену
  waste_trim_kg NUMERIC(10,2) DEFAULT 0,       -- Обрезка краев рулонов

  -- Примечания
  notes TEXT,

  -- Статус смены
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),

  -- Метаданные
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_lam_shifts_date ON production_lamination_shifts(date);
CREATE INDEX IF NOT EXISTS idx_lam_shifts_machine ON production_lamination_shifts(machine_id);
CREATE INDEX IF NOT EXISTS idx_lam_shifts_status ON production_lamination_shifts(status);

-- Комментарии
COMMENT ON TABLE production_lamination_shifts IS 'Смены ламинации - пакетная обработка рулонов';
COMMENT ON COLUMN production_lamination_shifts.waste_oploy_kg IS 'Оплой - пленка с головы ламинатора в начале смены';
COMMENT ON COLUMN production_lamination_shifts.waste_shift_kg IS 'Общий отход за смену';
COMMENT ON COLUMN production_lamination_shifts.waste_trim_kg IS 'Обрезка краев рулонов';

-- ============================================================================
-- 2. ТАБЛИЦА РУЛОНОВ В РАМКАХ СМЕНЫ (Child)
-- ============================================================================
CREATE TABLE IF NOT EXISTS production_lamination_rolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ссылка на смену (Parent)
  shift_id UUID REFERENCES production_lamination_shifts(id) ON DELETE CASCADE,

  -- Входящий рулон (с ткачества)
  input_roll_id UUID REFERENCES weaving_rolls(id),
  input_roll_number TEXT,
  input_width_cm NUMERIC(10,2),
  input_weight_kg NUMERIC(10,2),

  -- Выходной рулон (ламинированный)
  output_roll_id UUID REFERENCES laminated_rolls(id),
  output_roll_number TEXT,
  output_width_cm NUMERIC(10,2),
  output_weight_kg NUMERIC(10,2),

  -- Метаданные
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_lam_rolls_shift ON production_lamination_rolls(shift_id);
CREATE INDEX IF NOT EXISTS idx_lam_rolls_input ON production_lamination_rolls(input_roll_id);
CREATE INDEX IF NOT EXISTS idx_lam_rolls_output ON production_lamination_rolls(output_roll_id);

-- Комментарии
COMMENT ON TABLE production_lamination_rolls IS 'Рулоны обработанные в рамках смены ламинации';
COMMENT ON COLUMN production_lamination_rolls.input_roll_id IS 'Входящий рулон с ткачества';
COMMENT ON COLUMN production_lamination_rolls.output_roll_id IS 'Выходной ламинированный рулон';

-- ============================================================================
-- 3. ФУНКЦИЯ АВТОМАТИЧЕСКОЙ ГЕНЕРАЦИИ DOC_NUMBER
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_lamination_shift_doc_number()
RETURNS TRIGGER AS $$
DECLARE
  v_date_part TEXT;
  v_counter INT;
  v_doc_number TEXT;
BEGIN
  -- Формат: LAM-YYYYMMDD-NNN
  v_date_part := TO_CHAR(NEW.date, 'YYYYMMDD');

  -- Находим максимальный счетчик за эту дату
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(doc_number FROM 'LAM-\d{8}-(\d{3})') AS INTEGER)
  ), 0) + 1
  INTO v_counter
  FROM production_lamination_shifts
  WHERE date = NEW.date;

  -- Генерируем номер документа
  v_doc_number := 'LAM-' || v_date_part || '-' || LPAD(v_counter::TEXT, 3, '0');

  NEW.doc_number := v_doc_number;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггер для автогенерации doc_number
DROP TRIGGER IF EXISTS trigger_generate_lam_shift_doc_number ON production_lamination_shifts;
CREATE TRIGGER trigger_generate_lam_shift_doc_number
  BEFORE INSERT ON production_lamination_shifts
  FOR EACH ROW
  WHEN (NEW.doc_number IS NULL)
  EXECUTE FUNCTION generate_lamination_shift_doc_number();

-- ============================================================================
-- 4. ФУНКЦИЯ ОБНОВЛЕНИЯ UPDATED_AT
-- ============================================================================
CREATE OR REPLACE FUNCTION update_lamination_shift_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_lam_shift_timestamp ON production_lamination_shifts;
CREATE TRIGGER trigger_update_lam_shift_timestamp
  BEFORE UPDATE ON production_lamination_shifts
  FOR EACH ROW
  EXECUTE FUNCTION update_lamination_shift_timestamp();

-- ============================================================================
-- 5. VIEW ДЛЯ ОТОБРАЖЕНИЯ СМЕН С АГРЕГАЦИЕЙ
-- ============================================================================
CREATE OR REPLACE VIEW lamination_shifts_summary AS
SELECT
  s.id,
  s.doc_number,
  s.date,
  s.shift,
  s.status,
  s.machine_id,
  e.name as machine_name,

  -- Операторы
  emp1.full_name as operator1_name,
  emp2.full_name as operator2_name,
  emp3.full_name as operator3_name,

  -- Агрегация по рулонам
  COUNT(r.id) as rolls_count,
  COALESCE(SUM(r.input_weight_kg), 0) as total_input_weight,
  COALESCE(SUM(r.output_weight_kg), 0) as total_output_weight,
  COALESCE(SUM(r.output_weight_kg) - SUM(r.input_weight_kg), 0) as weight_gain,

  -- Отходы
  s.waste_oploy_kg,
  s.waste_shift_kg,
  s.waste_trim_kg,
  (s.waste_oploy_kg + s.waste_shift_kg + s.waste_trim_kg) as total_waste,

  s.notes,
  s.created_at,
  s.updated_at
FROM production_lamination_shifts s
LEFT JOIN equipment e ON s.machine_id = e.id
LEFT JOIN employees emp1 ON s.operator1_id = emp1.id
LEFT JOIN employees emp2 ON s.operator2_id = emp2.id
LEFT JOIN employees emp3 ON s.operator3_id = emp3.id
LEFT JOIN production_lamination_rolls r ON s.id = r.shift_id
GROUP BY s.id, e.name, emp1.full_name, emp2.full_name, emp3.full_name
ORDER BY s.date DESC, s.created_at DESC;

-- ============================================================================
-- 6. МИГРАЦИЯ СТАРЫХ ДАННЫХ (опционально)
-- ============================================================================
-- Оставляем старую таблицу production_lamination для совместимости
-- Новые данные пишутся в production_lamination_shifts + production_lamination_rolls

-- Переименовываем старую таблицу
ALTER TABLE IF EXISTS production_lamination RENAME TO production_lamination_legacy;

-- Комментарий
COMMENT ON TABLE production_lamination_legacy IS 'УСТАРЕВШАЯ таблица ламинации (до переработки). Использовать production_lamination_shifts';

-- ============================================================================
-- ГОТОВО!
-- ============================================================================
-- Теперь модуль ламинации работает так:
-- 1. Создается смена (production_lamination_shifts) с 3 операторами
-- 2. В рамках смены добавляются рулоны (production_lamination_rolls)
-- 3. Указываются общие отходы и дозаторы
-- 4. При сдаче смены статус = 'completed'
