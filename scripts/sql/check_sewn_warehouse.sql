-- Проверка данных на складе отшитой продукции

-- 1. Все записи в таблице
SELECT
  doc_number,
  operation_date,
  operation_type,
  product_code,
  product_name,
  product_type,
  quantity,
  source_doc_type,
  employee_name,
  shift,
  status,
  created_at
FROM sewn_products_warehouse
ORDER BY created_at DESC
LIMIT 50;

-- 2. Баланс по продуктам (как в VIEW)
SELECT
  product_code,
  product_name,
  product_type,
  SUM(CASE WHEN operation_type = 'Приход' THEN quantity ELSE 0 END) AS total_received,
  SUM(CASE WHEN operation_type = 'Расход' THEN quantity ELSE 0 END) AS total_issued,
  SUM(CASE WHEN operation_type = 'Приход' THEN quantity ELSE -quantity END) AS balance,
  MAX(operation_date) AS last_movement_date
FROM sewn_products_warehouse
WHERE status = 'Активно'
GROUP BY product_code, product_name, product_type
ORDER BY product_name;

-- 3. VIEW
SELECT * FROM view_sewn_products_balance;
