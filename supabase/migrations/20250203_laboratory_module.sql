-- Модуль Лаборатории
-- Единая таблица для всех типов испытаний, test_data JSONB хранит поля конкретного теста

CREATE TABLE IF NOT EXISTS lab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  doc_number TEXT UNIQUE NOT NULL,
  test_type TEXT NOT NULL CHECK (test_type IN ('yarn', 'extruder', 'machine', 'fabric', 'strap', 'lamination', 'mfi')),
  operator TEXT,
  result TEXT CHECK (result IN ('Годен', 'Брак', '')),
  notes TEXT,
  test_data JSONB NOT NULL DEFAULT '{}',
  recorded_by UUID REFERENCES auth.users(id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_lab_tests_test_type ON lab_tests(test_type);
CREATE INDEX IF NOT EXISTS idx_lab_tests_created_at ON lab_tests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lab_tests_doc_number ON lab_tests(doc_number);

-- RLS
ALTER TABLE lab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lab_tests_select" ON lab_tests FOR SELECT USING (true);
CREATE POLICY "lab_tests_insert" ON lab_tests FOR INSERT WITH CHECK (true);
CREATE POLICY "lab_tests_update" ON lab_tests FOR UPDATE USING (true);
CREATE POLICY "lab_tests_delete" ON lab_tests FOR DELETE USING (true);

-- Генерация номера документа: LAB-{PREFIX}-YYYYMMDD-{seq}
CREATE OR REPLACE FUNCTION generate_lab_doc_number(p_prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  v_seq INTEGER;
  v_date TEXT;
BEGIN
  v_date := TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO v_seq FROM lab_tests WHERE doc_number LIKE p_prefix || '-' || v_date || '-%';
  RETURN p_prefix || '-' || v_date || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
