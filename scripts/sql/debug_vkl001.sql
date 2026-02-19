-- Детальная проверка почему VKL-001 не показывается в VIEW

-- 1. ВСЕ записи с VKL-001 (включая неактивные)
SELECT
  doc_number,
  operation_date,
  operation_type,
  product_code,
  product_name,
  product_type,
  quantity,
  status,
  created_at
FROM sewn_products_warehouse
WHERE product_code = 'VKL-001'
ORDER BY created_at;

-- 2. Расчет баланса для VKL-001 вручную
SELECT
  product_code,
  product_name,
  product_type,
  COUNT(*) as total_records,
  SUM(CASE WHEN operation_type = 'Приход' THEN quantity ELSE 0 END) AS total_received,
  SUM(CASE WHEN operation_type = 'Расход' THEN quantity ELSE 0 END) AS total_issued,
  SUM(CASE WHEN operation_type = 'Приход' THEN quantity ELSE -quantity END) AS balance,
  SUM(CASE WHEN status = 'Активно' THEN 1 ELSE 0 END) as active_records
FROM sewn_products_warehouse
WHERE product_code = 'VKL-001'
GROUP BY product_code, product_name, product_type;

-- 3. Проверка с условием как в VIEW (WHERE status = 'Активно')
SELECT
  product_code,
  product_name,
  product_type,
  COUNT(*) as total_records,
  SUM(CASE WHEN operation_type = 'Приход' THEN quantity ELSE 0 END) AS total_received,
  SUM(CASE WHEN operation_type = 'Расход' THEN quantity ELSE 0 END) AS total_issued,
  SUM(CASE WHEN operation_type = 'Приход' THEN quantity ELSE -quantity END) AS balance
FROM sewn_products_warehouse
WHERE product_code = 'VKL-001' AND status = 'Активно'
GROUP BY product_code, product_name, product_type;

-- 4. Показать разные product_name для одного product_code
SELECT DISTINCT
  product_code,
  product_name,
  product_type
FROM sewn_products_warehouse
WHERE product_code = 'VKL-001';
