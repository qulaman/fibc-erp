-- Создание таблиц для учета отходов и брака

-- Таблица отходов (waste materials)
CREATE TABLE IF NOT EXISTS waste_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  workshop TEXT NOT NULL CHECK (workshop IN ('extrusion', 'weaving', 'lamination', 'straps', 'cutting', 'sewing', 'qc')),
  material_type TEXT NOT NULL,
  material_description TEXT,
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL CHECK (unit IN ('kg', 'meters', 'pieces', 'rolls')),
  reason TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id)
);

-- Таблица брака (defect materials)
CREATE TABLE IF NOT EXISTS defect_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  workshop TEXT NOT NULL CHECK (workshop IN ('extrusion', 'weaving', 'lamination', 'straps', 'cutting', 'sewing', 'qc')),
  material_type TEXT NOT NULL,
  material_description TEXT,
  quantity NUMERIC(10, 2) NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL CHECK (unit IN ('kg', 'meters', 'pieces', 'rolls')),
  defect_type TEXT NOT NULL,
  reason TEXT,
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_waste_materials_workshop ON waste_materials(workshop);
CREATE INDEX IF NOT EXISTS idx_waste_materials_created_at ON waste_materials(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waste_materials_material_type ON waste_materials(material_type);

CREATE INDEX IF NOT EXISTS idx_defect_materials_workshop ON defect_materials(workshop);
CREATE INDEX IF NOT EXISTS idx_defect_materials_created_at ON defect_materials(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_defect_materials_material_type ON defect_materials(material_type);
CREATE INDEX IF NOT EXISTS idx_defect_materials_defect_type ON defect_materials(defect_type);

-- RLS политики
ALTER TABLE waste_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE defect_materials ENABLE ROW LEVEL SECURITY;

-- Политики для waste_materials
CREATE POLICY "Enable read access for all users" ON waste_materials
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON waste_materials
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON waste_materials
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON waste_materials
  FOR DELETE USING (true);

-- Политики для defect_materials
CREATE POLICY "Enable read access for all users" ON defect_materials
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON defect_materials
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users" ON defect_materials
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for authenticated users" ON defect_materials
  FOR DELETE USING (true);

-- Функция для получения статистики отходов по цехам
CREATE OR REPLACE FUNCTION get_waste_statistics(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  workshop TEXT,
  total_quantity NUMERIC,
  unit TEXT,
  material_type TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.workshop,
    SUM(w.quantity) as total_quantity,
    w.unit,
    w.material_type,
    COUNT(*) as count
  FROM waste_materials w
  WHERE
    (p_start_date IS NULL OR w.created_at >= p_start_date)
    AND (p_end_date IS NULL OR w.created_at <= p_end_date)
  GROUP BY w.workshop, w.unit, w.material_type
  ORDER BY w.workshop, total_quantity DESC;
END;
$$ LANGUAGE plpgsql;

-- Функция для получения статистики брака по цехам
CREATE OR REPLACE FUNCTION get_defect_statistics(
  p_start_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS TABLE (
  workshop TEXT,
  defect_type TEXT,
  total_quantity NUMERIC,
  unit TEXT,
  material_type TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.workshop,
    d.defect_type,
    SUM(d.quantity) as total_quantity,
    d.unit,
    d.material_type,
    COUNT(*) as count
  FROM defect_materials d
  WHERE
    (p_start_date IS NULL OR d.created_at >= p_start_date)
    AND (p_end_date IS NULL OR d.created_at <= p_end_date)
  GROUP BY d.workshop, d.defect_type, d.unit, d.material_type
  ORDER BY d.workshop, total_quantity DESC;
END;
$$ LANGUAGE plpgsql;
