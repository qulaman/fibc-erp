-- Миграция: Модуль отпуска готовой продукции клиентам
-- Дата: 2025-02-19

-- 1. Таблица отпусков готовой продукции
CREATE TABLE IF NOT EXISTS finished_goods_shipments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shipment_number TEXT NOT NULL UNIQUE,
  shipment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  client_name TEXT NOT NULL,
  responsible_person TEXT,
  employee_id UUID REFERENCES employees(id),
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_type TEXT,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit TEXT DEFAULT 'шт',
  notes TEXT,
  status TEXT DEFAULT 'Проведено' CHECK (status IN ('Проведено', 'Черновик', 'Отменён')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_shipments_date ON finished_goods_shipments(shipment_date DESC);
CREATE INDEX IF NOT EXISTS idx_shipments_client ON finished_goods_shipments(client_name);
CREATE INDEX IF NOT EXISTS idx_shipments_product ON finished_goods_shipments(product_code);
CREATE INDEX IF NOT EXISTS idx_shipments_number ON finished_goods_shipments(shipment_number);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON finished_goods_shipments(status);

-- 3. Функция генерации номера документа отпуска
CREATE OR REPLACE FUNCTION generate_shipment_number()
RETURNS TEXT AS $$
DECLARE
  v_date TEXT;
  v_counter INTEGER;
  v_number TEXT;
BEGIN
  v_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  -- Получаем счетчик за сегодня
  SELECT COUNT(*) + 1 INTO v_counter
  FROM finished_goods_shipments
  WHERE shipment_date = CURRENT_DATE;

  v_number := 'OTP-' || v_date || '-' || LPAD(v_counter::TEXT, 4, '0');

  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- 4. Триггер автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_shipment_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shipment_timestamp
BEFORE UPDATE ON finished_goods_shipments
FOR EACH ROW
EXECUTE FUNCTION update_shipment_timestamp();

-- 5. VIEW: Статистика по отпускам
CREATE OR REPLACE VIEW shipments_statistics AS
SELECT
  shipment_date,
  client_name,
  COUNT(*) AS total_items,
  SUM(quantity) AS total_quantity,
  STRING_AGG(DISTINCT product_name, ', ') AS products
FROM finished_goods_shipments
WHERE status = 'Проведено'
GROUP BY shipment_date, client_name
ORDER BY shipment_date DESC;

-- 6. VIEW: Остатки готовой продукции с учетом отпусков
CREATE OR REPLACE VIEW finished_goods_balance_with_shipments AS
SELECT
  fg.product_code,
  fg.product_name,
  COALESCE(SUM(
    CASE
      WHEN fg.operation = 'Приход' THEN fg.quantity
      WHEN fg.operation = 'Расход' THEN -fg.quantity
      ELSE 0
    END
  ), 0) AS warehouse_balance,
  COALESCE((
    SELECT SUM(s.quantity)
    FROM finished_goods_shipments s
    WHERE s.product_code = fg.product_code
      AND s.status = 'Проведено'
  ), 0) AS shipped_quantity,
  COALESCE(SUM(
    CASE
      WHEN fg.operation = 'Приход' THEN fg.quantity
      WHEN fg.operation = 'Расход' THEN -fg.quantity
      ELSE 0
    END
  ), 0) - COALESCE((
    SELECT SUM(s.quantity)
    FROM finished_goods_shipments s
    WHERE s.product_code = fg.product_code
      AND s.status = 'Проведено'
  ), 0) AS available_balance
FROM finished_goods_warehouse fg
GROUP BY fg.product_code, fg.product_name
HAVING COALESCE(SUM(
  CASE
    WHEN fg.operation = 'Приход' THEN fg.quantity
    WHEN fg.operation = 'Расход' THEN -fg.quantity
    ELSE 0
  END
), 0) > 0
ORDER BY fg.product_name;

-- 7. Комментарии к таблице
COMMENT ON TABLE finished_goods_shipments IS 'Журнал отпуска готовой продукции клиентам';
COMMENT ON COLUMN finished_goods_shipments.shipment_number IS 'Уникальный номер документа отпуска (OTP-YYYYMMDD-NNNN)';
COMMENT ON COLUMN finished_goods_shipments.client_name IS 'Название организации-клиента';
COMMENT ON COLUMN finished_goods_shipments.responsible_person IS 'ФИО ответственного за отпуск';
COMMENT ON COLUMN finished_goods_shipments.employee_id IS 'ID сотрудника-кладовщика (связь с employees)';
COMMENT ON COLUMN finished_goods_shipments.status IS 'Статус документа: Проведено, Черновик, Отменён';

-- Завершено
