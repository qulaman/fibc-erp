-- ═══════════════════════════════════════════════════════════════════════════
-- МОДУЛЬ ПЕЧАТИ
-- ═══════════════════════════════════════════════════════════════════════════
-- Производство: нанесение краски на кроеные детали со склада кроя
-- Дата: 2025-02-03

-- 1. ЖУРНАЛ ПРОИЗВОДСТВА ПЕЧАТИ
CREATE TABLE IF NOT EXISTS production_printing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number TEXT NOT NULL UNIQUE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME NOT NULL DEFAULT CURRENT_TIME,
  shift TEXT CHECK (shift IN ('День', 'Ночь')),
  operator TEXT,
  operator_id UUID REFERENCES employees(id),
  cutting_type_code TEXT NOT NULL,
  cutting_type_name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  paint_name TEXT NOT NULL,
  paint_consumption_g NUMERIC(10,2),
  notes TEXT,
  status TEXT DEFAULT 'Проведено' CHECK (status IN ('Черновик', 'Проведено', 'Отменено')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ИНДЕКСЫ
CREATE INDEX IF NOT EXISTS idx_production_printing_date ON production_printing(date DESC);
CREATE INDEX IF NOT EXISTS idx_production_printing_doc_number ON production_printing(doc_number);
CREATE INDEX IF NOT EXISTS idx_production_printing_cutting_type ON production_printing(cutting_type_code);
CREATE INDEX IF NOT EXISTS idx_production_printing_paint ON production_printing(paint_name);

-- 3. RLS
ALTER TABLE production_printing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "production_printing_select" ON production_printing FOR SELECT USING (true);
CREATE POLICY "production_printing_insert" ON production_printing FOR INSERT WITH CHECK (true);
CREATE POLICY "production_printing_update" ON production_printing FOR UPDATE USING (true);
CREATE POLICY "production_printing_delete" ON production_printing FOR DELETE USING (true);

-- 4. ТРИГГЕР updated_at
CREATE OR REPLACE FUNCTION update_printing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_printing_updated_at
  BEFORE UPDATE ON production_printing
  FOR EACH ROW EXECUTE FUNCTION update_printing_updated_at();
