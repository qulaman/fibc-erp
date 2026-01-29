-- =====================================================
-- СКЛАД МФН НИТИ (отдельный от основного склада сырья)
-- =====================================================
-- Создание отдельного склада для МФН нити

CREATE TABLE IF NOT EXISTS mfn_warehouse (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Документ
  doc_number VARCHAR(50) UNIQUE NOT NULL,
  operation_date DATE NOT NULL,
  operation_time TIME NOT NULL DEFAULT CURRENT_TIME,

  -- Тип операции
  operation_type VARCHAR(20) NOT NULL CHECK (operation_type IN ('Приход', 'Расход', 'Возврат', 'Инвентаризация')),

  -- Материал (МФН нить)
  material_code VARCHAR(50) NOT NULL,
  material_name VARCHAR(255) NOT NULL,
  material_type VARCHAR(100) DEFAULT 'МФН', -- Всегда МФН

  -- Характеристики МФН
  denier NUMERIC(10,2), -- Денье (плотность нити)
  color VARCHAR(100), -- Цвет нити

  -- Количество
  quantity_kg NUMERIC(12,3) NOT NULL CHECK (quantity_kg > 0),

  -- Цена и сумма
  price_per_kg NUMERIC(12,2),
  total_amount NUMERIC(15,2),

  -- Поставщик (для прихода)
  supplier_name VARCHAR(255),
  invoice_number VARCHAR(100),

  -- Назначение (для расхода)
  destination VARCHAR(255), -- Куда списано (производство, цех)
  destination_doc VARCHAR(50), -- Номер документа-назначения

  -- Ответственные
  responsible_person VARCHAR(255),

  -- Дополнительно
  notes TEXT,
  status VARCHAR(20) DEFAULT 'Активно',

  -- Метаданные
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Индексы
CREATE INDEX idx_mfn_warehouse_date ON mfn_warehouse(operation_date DESC);
CREATE INDEX idx_mfn_warehouse_material ON mfn_warehouse(material_code);
CREATE INDEX idx_mfn_warehouse_operation ON mfn_warehouse(operation_type);
CREATE INDEX idx_mfn_warehouse_doc ON mfn_warehouse(doc_number);
CREATE INDEX idx_mfn_warehouse_denier ON mfn_warehouse(denier);

COMMENT ON TABLE mfn_warehouse IS 'Склад МФН нити - отдельное хранение от основного сырья';

-- =====================================================
-- VIEW: ОСТАТКИ МФН НА СКЛАДЕ
-- =====================================================

CREATE OR REPLACE VIEW view_mfn_balance AS
SELECT
  material_code,
  material_name,
  denier,
  color,

  -- Расчет остатков
  SUM(CASE
    WHEN operation_type = 'Приход' OR operation_type = 'Возврат'
    THEN quantity_kg
    ELSE 0
  END) AS total_in,

  SUM(CASE
    WHEN operation_type = 'Расход'
    THEN quantity_kg
    ELSE 0
  END) AS total_out,

  SUM(CASE
    WHEN operation_type IN ('Приход', 'Возврат')
    THEN quantity_kg
    WHEN operation_type = 'Расход'
    THEN -quantity_kg
    ELSE 0
  END) AS balance_kg,

  -- Средняя цена
  AVG(price_per_kg) FILTER (WHERE price_per_kg IS NOT NULL) AS avg_price_per_kg,

  -- Дата последнего движения
  MAX(operation_date) AS last_movement_date,

  -- Количество операций
  COUNT(*) AS operation_count,

  NOW() AS calculated_at

FROM mfn_warehouse
WHERE status = 'Активно'
GROUP BY material_code, material_name, denier, color
HAVING SUM(CASE
  WHEN operation_type IN ('Приход', 'Возврат')
  THEN quantity_kg
  WHEN operation_type = 'Расход'
  THEN -quantity_kg
  ELSE 0
END) > 0
ORDER BY material_name, denier;

COMMENT ON VIEW view_mfn_balance IS 'Остатки МФН нити на складе';

-- =====================================================
-- VIEW: СТАТИСТИКА ПО МФН
-- =====================================================

CREATE OR REPLACE VIEW view_mfn_statistics AS
SELECT
  material_code,
  material_name,
  denier,
  color,

  -- Общие показатели
  SUM(CASE WHEN operation_type = 'Приход' THEN quantity_kg ELSE 0 END) AS total_received,
  SUM(CASE WHEN operation_type = 'Расход' THEN quantity_kg ELSE 0 END) AS total_consumed,
  SUM(CASE WHEN operation_type = 'Возврат' THEN quantity_kg ELSE 0 END) AS total_returned,

  -- Финансы
  SUM(CASE WHEN operation_type = 'Приход' THEN total_amount ELSE 0 END) AS total_purchase_amount,
  AVG(price_per_kg) FILTER (WHERE operation_type = 'Приход') AS avg_purchase_price,

  -- Период
  MIN(operation_date) AS first_operation,
  MAX(operation_date) AS last_operation,
  COUNT(*) AS total_operations

FROM mfn_warehouse
WHERE status = 'Активно'
GROUP BY material_code, material_name, denier, color
ORDER BY total_received DESC;

COMMENT ON VIEW view_mfn_statistics IS 'Статистика по МФН нити';

-- =====================================================
-- ТРИГГЕР ДЛЯ UPDATED_AT
-- =====================================================

DROP TRIGGER IF EXISTS update_mfn_warehouse_updated_at ON mfn_warehouse;
CREATE TRIGGER update_mfn_warehouse_updated_at
    BEFORE UPDATE ON mfn_warehouse
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

ALTER TABLE mfn_warehouse ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to mfn_warehouse" ON mfn_warehouse;
CREATE POLICY "Allow all access to mfn_warehouse"
    ON mfn_warehouse
    FOR ALL
    TO public
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- ПЕРЕНОС ДАННЫХ ИЗ INVENTORY (если МФН уже есть там)
-- =====================================================

-- Комментарий: Выполните этот блок, если у вас уже есть МФН в таблице inventory
-- и вы хотите перенести их в новый склад МФН

/*
INSERT INTO mfn_warehouse (
  doc_number,
  operation_date,
  operation_time,
  operation_type,
  material_code,
  material_name,
  material_type,
  quantity_kg,
  price_per_kg,
  total_amount,
  supplier_name,
  notes,
  status,
  created_at
)
SELECT
  'MFN-MIG-' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 5, '0') as doc_number,
  date as operation_date,
  COALESCE(time, CURRENT_TIME) as operation_time,
  operation as operation_type,
  code as material_code,
  name as material_name,
  'МФН' as material_type,
  quantity_kg,
  price_per_kg,
  total_amount,
  supplier as supplier_name,
  notes,
  status,
  created_at
FROM inventory
WHERE type = 'МФН' OR name ILIKE '%мфн%' OR name ILIKE '%mfn%'
  AND status = 'Активно';

-- После переноса можно удалить МФН из inventory:
-- DELETE FROM inventory WHERE type = 'МФН' OR name ILIKE '%мфн%' OR name ILIKE '%mfn%';
*/

-- =====================================================
-- ГОТОВО!
-- =====================================================

SELECT 'MFN warehouse created successfully!' AS message;
SELECT 'Total tables created: 1 (mfn_warehouse)' AS info;
SELECT 'Total views created: 2 (view_mfn_balance, view_mfn_statistics)' AS info;
