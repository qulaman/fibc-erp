-- ============================================
-- Журнал обслуживания и ремонта оборудования
-- ============================================

-- 1. Основная таблица журнала
CREATE TABLE IF NOT EXISTS equipment_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  maintenance_type TEXT NOT NULL CHECK (maintenance_type IN ('maintenance', 'repair', 'inspection')),
  description TEXT NOT NULL,
  performed_by UUID REFERENCES employees(id),
  performed_by_name TEXT,
  shift TEXT CHECK (shift IN ('day', 'night')),
  downtime_hours NUMERIC(6,2) DEFAULT 0,
  parts_used JSONB DEFAULT '[]'::jsonb,
  total_cost NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'completed' CHECK (status IN ('planned', 'in_progress', 'completed')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID
);

-- 2. Индексы
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_equipment ON equipment_maintenance(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_date ON equipment_maintenance(date DESC);
CREATE INDEX IF NOT EXISTS idx_equipment_maintenance_type ON equipment_maintenance(maintenance_type);

-- 3. Комментарии
COMMENT ON TABLE equipment_maintenance IS 'Журнал обслуживания и ремонта оборудования';
COMMENT ON COLUMN equipment_maintenance.maintenance_type IS 'maintenance=ТО, repair=Ремонт, inspection=Осмотр';
COMMENT ON COLUMN equipment_maintenance.parts_used IS 'JSON массив: [{name, quantity, unit, cost}]';
