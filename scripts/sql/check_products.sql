-- Проверка справочника готовой продукции

SELECT
  code,
  name,
  category,
  is_active
FROM product_catalog
WHERE is_active = true
ORDER BY category, name;

-- Проверка последних записей готовой продукции
SELECT
  doc_number,
  operation_date,
  product_code,
  product_name,
  product_type,
  quantity,
  shift,
  created_at
FROM sewn_products_warehouse
WHERE operation_type = 'Приход'
ORDER BY created_at DESC
LIMIT 10;
