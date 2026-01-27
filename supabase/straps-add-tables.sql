-- Добавление недостающих таблиц для модуля строп
-- Таблица strap_types уже существует

-- 1. Журнал производства строп
CREATE TABLE IF NOT EXISTS production_straps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  shift VARCHAR(20) NOT NULL,
  machine_id UUID,
  operator_id UUID,
  strap_type_id UUID REFERENCES strap_types(id) NOT NULL,
  produced_length NUMERIC(10,2) NOT NULL,
  produced_weight NUMERIC(10,2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_straps_date ON production_straps(date);
CREATE INDEX IF NOT EXISTS idx_production_straps_strap_type ON production_straps(strap_type_id);

-- 2. Склад строп
CREATE TABLE IF NOT EXISTS straps_warehouse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_number VARCHAR(100) UNIQUE,
  production_id UUID REFERENCES production_straps(id),
  strap_type_id UUID REFERENCES strap_types(id) NOT NULL,
  produced_length NUMERIC(10,2) NOT NULL,
  produced_weight NUMERIC(10,2) NOT NULL,
  length NUMERIC(10,2),
  weight NUMERIC(10,2),
  status VARCHAR(50) DEFAULT 'available',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_straps_warehouse_status ON straps_warehouse(status);
CREATE INDEX IF NOT EXISTS idx_straps_warehouse_strap_type ON straps_warehouse(strap_type_id);

-- 3. Триггер автосоздания на складе
CREATE OR REPLACE FUNCTION auto_create_strap_warehouse_entry()
RETURNS TRIGGER AS $$
DECLARE
  v_roll_number VARCHAR(100);
  v_strap_code VARCHAR(50);
BEGIN
  SELECT code INTO v_strap_code FROM strap_types WHERE id = NEW.strap_type_id;
  v_roll_number := 'STRAP-' || TO_CHAR(NEW.date, 'YYYYMMDD') || '-' || COALESCE(v_strap_code, 'UNKNOWN') || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);

  INSERT INTO straps_warehouse (
    roll_number, production_id, strap_type_id,
    produced_length, produced_weight, length, weight, status
  ) VALUES (
    v_roll_number, NEW.id, NEW.strap_type_id,
    NEW.produced_length, NEW.produced_weight,
    NEW.produced_length, NEW.produced_weight, 'available'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_create_strap_warehouse ON production_straps;
CREATE TRIGGER trigger_auto_create_strap_warehouse
  AFTER INSERT ON production_straps
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_strap_warehouse_entry();
