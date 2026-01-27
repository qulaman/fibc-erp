-- ═══════════════════════════════════════════════════════════════════════════
-- МОДУЛЬ ТКАЧЕСТВА - СХЕМА БАЗЫ ДАННЫХ
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. СПРАВОЧНИК ТКАНЕЙ
CREATE TABLE IF NOT EXISTS fabric_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  width_cm NUMERIC(10,2),
  density NUMERIC(10,2),
  color VARCHAR(100),

  -- Нити для производства
  weft_yarn_code VARCHAR(50), -- Уточная нить
  warp_yarn_code VARCHAR(50), -- Основная нить

  -- Нормы расхода (кг/метр)
  weft_consumption_per_meter NUMERIC(10,4) DEFAULT 0,
  warp_consumption_per_meter NUMERIC(10,4) DEFAULT 0,

  -- Статус
  status VARCHAR(20) DEFAULT 'Активно',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. ЖУРНАЛ ПРОИЗВОДСТВА ТКАЧЕСТВА
CREATE TABLE IF NOT EXISTS production_weaving (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number VARCHAR(50) UNIQUE NOT NULL,

  -- Дата и смена
  date DATE NOT NULL,
  shift VARCHAR(20), -- День/Ночь

  -- Производственная линия
  machine_id UUID REFERENCES equipment(id),
  operator_id UUID REFERENCES employees(id),

  -- Произведенная ткань
  fabric_type_id UUID REFERENCES fabric_types(id),

  -- Использованные нити
  weft_yarn_code VARCHAR(50),
  warp_yarn_code VARCHAR(50),
  weft_batch VARCHAR(50),
  warp_batch VARCHAR(50),

  -- Объем производства (за эту смену)
  length_meters NUMERIC(10,2) DEFAULT 0,
  weight_kg NUMERIC(10,2) DEFAULT 0,
  defect_meters NUMERIC(10,2) DEFAULT 0,

  -- Расход нити (за эту смену)
  weft_consumption_kg NUMERIC(10,2) DEFAULT 0,
  warp_consumption_kg NUMERIC(10,2) DEFAULT 0,

  -- Простои
  downtime_minutes INTEGER DEFAULT 0,
  downtime_reason TEXT,

  -- Статус рулона
  roll_status VARCHAR(20) DEFAULT 'В работе', -- В работе / Завершен
  roll_number VARCHAR(50), -- Номер завершенного рулона

  -- Общие показатели рулона (накопительные)
  total_length_meters NUMERIC(10,2) DEFAULT 0,
  total_weight_kg NUMERIC(10,2) DEFAULT 0,

  -- Связь с предыдущим документом (для продолжения рулона)
  previous_doc_id UUID REFERENCES production_weaving(id),

  -- Примечания
  notes TEXT,

  -- Статус документа
  status VARCHAR(20) DEFAULT 'Завершен',

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. СКЛАД ТКАНИ
CREATE TABLE IF NOT EXISTS fabric_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number VARCHAR(50) UNIQUE NOT NULL,

  -- Дата операции
  date DATE NOT NULL,
  time TIME,

  -- Тип операции
  operation_type VARCHAR(20) NOT NULL, -- Приход/Расход

  -- Рулон
  roll_number VARCHAR(50),
  fabric_type_id UUID REFERENCES fabric_types(id),

  -- Количество
  length_meters NUMERIC(10,2) DEFAULT 0,
  weight_kg NUMERIC(10,2) DEFAULT 0,

  -- Связанный документ
  linked_doc VARCHAR(50),
  counterparty VARCHAR(255), -- Клиент для расхода

  -- Статус
  status VARCHAR(20) DEFAULT 'Завершен',

  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. ИНДЕКСЫ
CREATE INDEX IF NOT EXISTS idx_weaving_date ON production_weaving(date);
CREATE INDEX IF NOT EXISTS idx_weaving_fabric ON production_weaving(fabric_type_id);
CREATE INDEX IF NOT EXISTS idx_weaving_machine ON production_weaving(machine_id);
CREATE INDEX IF NOT EXISTS idx_weaving_roll_status ON production_weaving(roll_status);
CREATE INDEX IF NOT EXISTS idx_weaving_previous_doc ON production_weaving(previous_doc_id);

CREATE INDEX IF NOT EXISTS idx_fabric_inv_date ON fabric_inventory(date);
CREATE INDEX IF NOT EXISTS idx_fabric_inv_roll ON fabric_inventory(roll_number);
CREATE INDEX IF NOT EXISTS idx_fabric_inv_type ON fabric_inventory(operation_type);

-- 5. ФУНКЦИЯ: ОПРИХОДОВАНИЕ РУЛОНА НА СКЛАД
CREATE OR REPLACE FUNCTION add_fabric_to_inventory(
  p_roll_number VARCHAR,
  p_fabric_type_id UUID,
  p_length NUMERIC,
  p_weight NUMERIC,
  p_linked_doc VARCHAR
) RETURNS VOID AS $$
BEGIN
  INSERT INTO fabric_inventory (
    doc_number,
    date,
    time,
    operation_type,
    roll_number,
    fabric_type_id,
    length_meters,
    weight_kg,
    linked_doc,
    status
  ) VALUES (
    'RCP-' || to_char(NOW(), 'YYMMDD-HH24MISS'),
    CURRENT_DATE,
    CURRENT_TIME,
    'Приход',
    p_roll_number,
    p_fabric_type_id,
    p_length,
    p_weight,
    p_linked_doc,
    'Завершен'
  );
END;
$$ LANGUAGE plpgsql;

-- 6. ФУНКЦИЯ: СПИСАНИЕ НИТИ СО СКЛАДА ЭКСТРУЗИИ
-- Эта функция будет записывать расход нити в таблицу yarn_inventory
CREATE OR REPLACE FUNCTION consume_yarn_for_weaving(
  p_yarn_code VARCHAR,
  p_batch VARCHAR,
  p_quantity NUMERIC,
  p_linked_doc VARCHAR
) RETURNS VOID AS $$
DECLARE
  v_yarn_type_id UUID;
BEGIN
  -- Находим ID типа нити по коду
  SELECT id INTO v_yarn_type_id
  FROM yarn_types
  WHERE code = p_yarn_code
  LIMIT 1;

  IF v_yarn_type_id IS NULL THEN
    RAISE EXCEPTION 'Тип нити % не найден', p_yarn_code;
  END IF;

  -- Записываем расход
  INSERT INTO yarn_inventory (
    doc_number,
    date,
    time,
    operation_type,
    yarn_type_id,
    batch_number,
    weight_kg,
    linked_doc,
    notes,
    status
  ) VALUES (
    'EXP-' || to_char(NOW(), 'YYMMDD-HH24MISS'),
    CURRENT_DATE,
    CURRENT_TIME,
    'Расход',
    v_yarn_type_id,
    p_batch,
    p_quantity,
    p_linked_doc,
    'Ткачество',
    'Завершен'
  );
END;
$$ LANGUAGE plpgsql;

-- 7. ТРИГГЕР: Автообновление updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_fabric_types_updated_at ON fabric_types;
CREATE TRIGGER update_fabric_types_updated_at
  BEFORE UPDATE ON fabric_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_production_weaving_updated_at ON production_weaving;
CREATE TRIGGER update_production_weaving_updated_at
  BEFORE UPDATE ON production_weaving
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 8. ПРЕДСТАВЛЕНИЕ: Остатки на складе ткани
CREATE OR REPLACE VIEW fabric_stock_balance AS
SELECT
  f.id as fabric_type_id,
  f.code,
  f.name,
  f.width_cm,
  f.color,
  COALESCE(SUM(CASE WHEN fi.operation_type = 'Приход' THEN fi.length_meters ELSE 0 END), 0) as total_receipt_meters,
  COALESCE(SUM(CASE WHEN fi.operation_type = 'Расход' THEN fi.length_meters ELSE 0 END), 0) as total_expense_meters,
  COALESCE(SUM(CASE WHEN fi.operation_type = 'Приход' THEN fi.weight_kg ELSE 0 END), 0) as total_receipt_kg,
  COALESCE(SUM(CASE WHEN fi.operation_type = 'Расход' THEN fi.weight_kg ELSE 0 END), 0) as total_expense_kg,
  COALESCE(SUM(CASE WHEN fi.operation_type = 'Приход' THEN fi.length_meters ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN fi.operation_type = 'Расход' THEN fi.length_meters ELSE 0 END), 0) as balance_meters,
  COALESCE(SUM(CASE WHEN fi.operation_type = 'Приход' THEN fi.weight_kg ELSE 0 END), 0) -
  COALESCE(SUM(CASE WHEN fi.operation_type = 'Расход' THEN fi.weight_kg ELSE 0 END), 0) as balance_kg
FROM fabric_types f
LEFT JOIN fabric_inventory fi ON f.id = fi.fabric_type_id AND fi.status = 'Завершен'
GROUP BY f.id, f.code, f.name, f.width_cm, f.color;

-- 9. КОММЕНТАРИИ
COMMENT ON TABLE fabric_types IS 'Справочник типов тканей';
COMMENT ON TABLE production_weaving IS 'Журнал производства ткачества';
COMMENT ON TABLE fabric_inventory IS 'Складской учет ткани';
COMMENT ON COLUMN production_weaving.roll_status IS 'В работе - рулон продолжается, Завершен - рулон готов';
COMMENT ON COLUMN production_weaving.previous_doc_id IS 'Ссылка на предыдущий документ при продолжении рулона';
