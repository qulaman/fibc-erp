-- Добавляем поле departments к raw_materials
-- Определяет в каких цехах используется данное сырье
ALTER TABLE raw_materials
ADD COLUMN IF NOT EXISTS departments TEXT[] DEFAULT '{}';

-- Пересоздать VIEW с новой колонкой (нельзя добавлять колонки через REPLACE)
DROP VIEW IF EXISTS view_material_balances;
CREATE VIEW view_material_balances AS
SELECT
  m.id,
  m.name,
  m.type,
  m.unit,
  m.min_stock,
  m.departments,
  COALESCE(SUM(CASE WHEN t.type = 'in' THEN t.quantity ELSE -t.quantity END), 0) AS current_balance
FROM raw_materials m
LEFT JOIN inventory_transactions t ON m.id = t.material_id
GROUP BY m.id;

COMMENT ON COLUMN raw_materials.departments IS 'Массив цехов: extrusion, lamination, etc.';
