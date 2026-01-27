-- STRAPS MODULE - MINIMAL SCHEMA

-- 1. Strap Types
CREATE TABLE IF NOT EXISTS strap_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  width NUMERIC(10,2),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Production Straps
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

-- 3. Straps Warehouse
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_production_straps_date ON production_straps(date);
CREATE INDEX IF NOT EXISTS idx_straps_warehouse_status ON straps_warehouse(status);

-- Auto-create warehouse entry trigger
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

-- Sample data
INSERT INTO strap_types (code, name, width, description) VALUES
('ST-100', 'Стропа 100мм', 100, 'Стандартная стропа 100мм'),
('ST-150', 'Стропа 150мм', 150, 'Стандартная стропа 150мм'),
('ST-200', 'Стропа 200мм', 200, 'Широкая стропа 200мм')
ON CONFLICT (code) DO NOTHING;
