-- =====================================================
-- СПРАВОЧНИК ГОТОВОЙ ПРОДУКЦИИ
-- =====================================================
-- Создание таблицы для справочника готовой продукции

CREATE TABLE IF NOT EXISTS product_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Код и название
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,

  -- Категория продукции
  category VARCHAR(100), -- 'Биг-Бэг', 'Вкладыш', 'Другое'

  -- Описание
  description TEXT,

  -- Статус
  is_active BOOLEAN DEFAULT true,

  -- Метаданные
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы (удаляем старые, если есть)
DROP INDEX IF EXISTS idx_product_catalog_code;
DROP INDEX IF EXISTS idx_product_catalog_category;
DROP INDEX IF EXISTS idx_product_catalog_active;

CREATE INDEX idx_product_catalog_code ON product_catalog(code);
CREATE INDEX idx_product_catalog_category ON product_catalog(category);
CREATE INDEX idx_product_catalog_active ON product_catalog(is_active);

COMMENT ON TABLE product_catalog IS 'Справочник готовой продукции';

-- =====================================================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- =====================================================

INSERT INTO product_catalog (code, name, category, description, is_active) VALUES
  ('VKL-001', 'Вагонный вкладыш', 'Вкладыш', 'Вагонный вкладыш стандартный', true),
  ('BB-2STR', 'Биг-Бэг 2х стропный', 'Биг-Бэг', 'Биг-Бэг с двумя стропами', true),
  ('BB-4STR', 'Биг-Бэг 4х стропный', 'Биг-Бэг', 'Биг-Бэг с четырьмя стропами', true)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE product_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to product_catalog" ON product_catalog;
CREATE POLICY "Allow all access to product_catalog"
    ON product_catalog
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- ТРИГГЕР ДЛЯ UPDATED_AT
-- =====================================================

DROP TRIGGER IF EXISTS update_product_catalog_updated_at ON product_catalog;
CREATE TRIGGER update_product_catalog_updated_at
    BEFORE UPDATE ON product_catalog
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ГОТОВО!
-- =====================================================

SELECT 'Product catalog created!' AS message;
SELECT * FROM product_catalog;
