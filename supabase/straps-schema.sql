-- ═══════════════════════════════════════════════════════════════════════════
-- МОДУЛЬ СТРОП (STRAPS MODULE)
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. СПРАВОЧНИК СТРОП (STRAPS MASTER DATA)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS straps_master (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Основные характеристики
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  width_cm NUMERIC(10,2) NOT NULL,
  color VARCHAR(100),

  -- Утóк (Weft)
  weft_yarn_code VARCHAR(50),
  weft_yarn_type VARCHAR(100),

  -- Оснóва (Warp)
  warp_yarn_code VARCHAR(50),
  warp_yarn_type VARCHAR(100),

  -- Метаданные
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_straps_master_code ON straps_master(code);
CREATE INDEX IF NOT EXISTS idx_straps_master_active ON straps_master(is_active);

COMMENT ON TABLE straps_master IS 'Справочник строп с характеристиками';
COMMENT ON COLUMN straps_master.weft_yarn_code IS 'Код нити для утка';
COMMENT ON COLUMN straps_master.warp_yarn_code IS 'Код нити для основы';

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. ЖУРНАЛ МФН (MULTIFILAMENT YARN JOURNAL)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mfn_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Документ
  doc_number VARCHAR(50) UNIQUE NOT NULL,
  date DATE NOT NULL,

  -- Материал
  yarn_code VARCHAR(50) NOT NULL,
  yarn_type VARCHAR(100) NOT NULL,

  -- Количество
  quantity_kg NUMERIC(10,2) NOT NULL,

  -- Партия (для трассировки)
  batch_number VARCHAR(100),

  -- Примечания
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mfn_journal_date ON mfn_journal(date);
CREATE INDEX IF NOT EXISTS idx_mfn_journal_yarn_code ON mfn_journal(yarn_code);
CREATE INDEX IF NOT EXISTS idx_mfn_journal_batch ON mfn_journal(batch_number);

COMMENT ON TABLE mfn_journal IS 'Журнал прихода МФН (мультифиламентная нить)';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ЖУРНАЛ ПРОИЗВОДСТВА СТРОП
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS production_straps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Документ
  doc_number VARCHAR(50) UNIQUE NOT NULL,
  date DATE NOT NULL,
  shift VARCHAR(20) NOT NULL,

  -- Оборудование и персонал
  machine_id UUID REFERENCES equipment(id),
  operator_id UUID REFERENCES employees(id),

  -- Стропа
  strap_id UUID REFERENCES straps_master(id) NOT NULL,

  -- Произведено
  output_length_meters NUMERIC(10,2) NOT NULL,
  output_weight_kg NUMERIC(10,2) NOT NULL,

  -- Использовано материалов (для удобства хранения)
  weft_consumed JSONB, -- {yarn_code, yarn_type, weight_kg, batch_numbers[]}
  warp_consumed JSONB, -- {yarn_code, yarn_type, weight_kg, batch_numbers[]}

  -- Примечания
  notes TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_straps_date ON production_straps(date);
CREATE INDEX IF NOT EXISTS idx_production_straps_strap ON production_straps(strap_id);
CREATE INDEX IF NOT EXISTS idx_production_straps_machine ON production_straps(machine_id);

COMMENT ON TABLE production_straps IS 'Журнал производства строп';
COMMENT ON COLUMN production_straps.weft_consumed IS 'Утóк: использованные материалы (JSON)';
COMMENT ON COLUMN production_straps.warp_consumed IS 'Оснóва: использованные материалы (JSON)';

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. СКЛАД СТРОП
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS straps_warehouse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Номер рулона
  roll_number VARCHAR(100) UNIQUE NOT NULL,

  -- Ссылка на производство
  production_id UUID REFERENCES production_straps(id),

  -- Стропа
  strap_id UUID REFERENCES straps_master(id) NOT NULL,

  -- Характеристики рулона
  length_meters NUMERIC(10,2) NOT NULL,
  weight_kg NUMERIC(10,2) NOT NULL,

  -- Партия (для трассировки)
  batch_number VARCHAR(100),

  -- Статус
  status VARCHAR(50) DEFAULT 'available', -- available, used, sold, etc.

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_straps_warehouse_strap ON straps_warehouse(strap_id);
CREATE INDEX IF NOT EXISTS idx_straps_warehouse_status ON straps_warehouse(status);
CREATE INDEX IF NOT EXISTS idx_straps_warehouse_batch ON straps_warehouse(batch_number);

COMMENT ON TABLE straps_warehouse IS 'Склад готовых строп';
COMMENT ON COLUMN straps_warehouse.status IS 'available = доступно, used = использовано, sold = продано';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. ТРАССИРОВКА СТРОП
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS straps_traceability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Связь с производством
  production_id UUID REFERENCES production_straps(id) NOT NULL,

  -- Входящие материалы
  yarn_code VARCHAR(50) NOT NULL,
  yarn_type VARCHAR(100) NOT NULL,
  material_type VARCHAR(20) NOT NULL, -- 'weft' или 'warp'

  -- Партия нити
  yarn_batch VARCHAR(100),

  -- Количество использовано
  quantity_kg NUMERIC(10,2) NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_straps_trace_production ON straps_traceability(production_id);
CREATE INDEX IF NOT EXISTS idx_straps_trace_yarn_batch ON straps_traceability(yarn_batch);

COMMENT ON TABLE straps_traceability IS 'Трассировка использованных материалов при производстве строп';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. ФУНКЦИЯ ОБРАБОТКИ ПРОИЗВОДСТВА СТРОП
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION process_straps_production(
  p_date DATE,
  p_shift VARCHAR,
  p_machine_id UUID,
  p_operator_id UUID,

  p_strap_id UUID,
  p_output_length NUMERIC,
  p_output_weight NUMERIC,

  p_weft_data JSONB, -- {yarn_code, yarn_type, weight, batches: [{batch, weight}]}
  p_warp_data JSONB, -- {yarn_code, yarn_type, weight, batches: [{batch, weight}]}

  p_notes TEXT
)
RETURNS JSON AS $$
DECLARE
  v_doc_number VARCHAR(50);
  v_production_id UUID;
  v_roll_number VARCHAR(50);
  v_roll_id UUID;
  v_strap_code VARCHAR(50);
  v_batch_item JSONB;
BEGIN
  -- 1. Генерируем номер документа
  v_doc_number := 'STRAP-' || TO_CHAR(p_date, 'YYYYMMDD') || '-' || LPAD(NEXTVAL('doc_sequence')::TEXT, 4, '0');

  -- 2. Получаем код стропы
  SELECT code INTO v_strap_code FROM straps_master WHERE id = p_strap_id;

  IF v_strap_code IS NULL THEN
    RAISE EXCEPTION 'Стропа с ID % не найдена', p_strap_id;
  END IF;

  -- 3. Генерируем номер рулона
  v_roll_number := v_doc_number || '-' || v_strap_code;

  -- 4. Создаем запись в журнале производства
  INSERT INTO production_straps (
    doc_number, date, shift, machine_id, operator_id,
    strap_id, output_length_meters, output_weight_kg,
    weft_consumed, warp_consumed, notes
  ) VALUES (
    v_doc_number, p_date, p_shift, p_machine_id, p_operator_id,
    p_strap_id, p_output_length, p_output_weight,
    p_weft_data, p_warp_data, p_notes
  ) RETURNING id INTO v_production_id;

  -- 5. Списываем утóк (weft) из склада нити
  IF p_weft_data IS NOT NULL AND p_weft_data->>'weight' IS NOT NULL THEN
    -- Проходим по партиям утка
    FOR v_batch_item IN SELECT * FROM jsonb_array_elements(p_weft_data->'batches')
    LOOP
      -- Списываем из yarn_inventory
      UPDATE yarn_inventory
      SET weight_kg = weight_kg - (v_batch_item->>'weight')::NUMERIC
      WHERE
        yarn_code = p_weft_data->>'yarn_code'
        AND batch_number = v_batch_item->>'batch';

      -- Записываем трассировку
      INSERT INTO straps_traceability (
        production_id, yarn_code, yarn_type, material_type,
        yarn_batch, quantity_kg
      ) VALUES (
        v_production_id,
        p_weft_data->>'yarn_code',
        p_weft_data->>'yarn_type',
        'weft',
        v_batch_item->>'batch',
        (v_batch_item->>'weight')::NUMERIC
      );
    END LOOP;
  END IF;

  -- 6. Списываем оснóву (warp) из склада нити
  IF p_warp_data IS NOT NULL AND p_warp_data->>'weight' IS NOT NULL THEN
    -- Проходим по партиям основы
    FOR v_batch_item IN SELECT * FROM jsonb_array_elements(p_warp_data->'batches')
    LOOP
      -- Списываем из yarn_inventory
      UPDATE yarn_inventory
      SET weight_kg = weight_kg - (v_batch_item->>'weight')::NUMERIC
      WHERE
        yarn_code = p_warp_data->>'yarn_code'
        AND batch_number = v_batch_item->>'batch';

      -- Записываем трассировку
      INSERT INTO straps_traceability (
        production_id, yarn_code, yarn_type, material_type,
        yarn_batch, quantity_kg
      ) VALUES (
        v_production_id,
        p_warp_data->>'yarn_code',
        p_warp_data->>'yarn_type',
        'warp',
        v_batch_item->>'batch',
        (v_batch_item->>'weight')::NUMERIC
      );
    END LOOP;
  END IF;

  -- 7. Создаем рулон на складе строп
  INSERT INTO straps_warehouse (
    roll_number, production_id, strap_id,
    length_meters, weight_kg, batch_number, status
  ) VALUES (
    v_roll_number, v_production_id, p_strap_id,
    p_output_length, p_output_weight, v_doc_number, 'available'
  ) RETURNING id INTO v_roll_id;

  -- 8. Возвращаем результат
  RETURN json_build_object(
    'success', true,
    'production_id', v_production_id,
    'doc_number', v_doc_number,
    'roll_id', v_roll_id,
    'roll_number', v_roll_number
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Ошибка при обработке производства строп: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. ФУНКЦИЯ ПРИХОДА МФН
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION process_mfn_receipt(
  p_date DATE,
  p_yarn_code VARCHAR,
  p_yarn_type VARCHAR,
  p_quantity_kg NUMERIC,
  p_batch_number VARCHAR,
  p_notes TEXT
)
RETURNS JSON AS $$
DECLARE
  v_doc_number VARCHAR(50);
  v_journal_id UUID;
BEGIN
  -- 1. Генерируем номер документа
  v_doc_number := 'MFN-' || TO_CHAR(p_date, 'YYYYMMDD') || '-' || LPAD(NEXTVAL('doc_sequence')::TEXT, 4, '0');

  -- 2. Создаем запись в журнале МФН
  INSERT INTO mfn_journal (
    doc_number, date, yarn_code, yarn_type,
    quantity_kg, batch_number, notes
  ) VALUES (
    v_doc_number, p_date, p_yarn_code, p_yarn_type,
    p_quantity_kg, p_batch_number, p_notes
  ) RETURNING id INTO v_journal_id;

  -- 3. Добавляем на склад нити (yarn_inventory)
  -- Проверяем, есть ли уже такая партия
  IF EXISTS (
    SELECT 1 FROM yarn_inventory
    WHERE yarn_code = p_yarn_code AND batch_number = p_batch_number
  ) THEN
    -- Обновляем существующую партию
    UPDATE yarn_inventory
    SET weight_kg = weight_kg + p_quantity_kg
    WHERE yarn_code = p_yarn_code AND batch_number = p_batch_number;
  ELSE
    -- Создаем новую партию
    INSERT INTO yarn_inventory (
      yarn_code, yarn_type, weight_kg, batch_number, status
    ) VALUES (
      p_yarn_code, p_yarn_type, p_quantity_kg, p_batch_number, 'available'
    );
  END IF;

  -- 4. Возвращаем результат
  RETURN json_build_object(
    'success', true,
    'journal_id', v_journal_id,
    'doc_number', v_doc_number
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Ошибка при обработке прихода МФН: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. ТРИГГЕРЫ ДЛЯ ОБНОВЛЕНИЯ TIMESTAMPS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_straps_master_updated_at
  BEFORE UPDATE ON straps_master
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mfn_journal_updated_at
  BEFORE UPDATE ON mfn_journal
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_production_straps_updated_at
  BEFORE UPDATE ON production_straps
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_straps_warehouse_updated_at
  BEFORE UPDATE ON straps_warehouse
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
