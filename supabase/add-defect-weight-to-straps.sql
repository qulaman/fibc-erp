-- =====================================================
-- Добавление полей для учета брака и расчетного веса
-- в производство строп
-- =====================================================

-- Добавляем колонку для веса брака
ALTER TABLE production_straps
ADD COLUMN IF NOT EXISTS defect_weight NUMERIC(10,3) DEFAULT 0;

-- Добавляем колонку для расчетного веса по спецификации
ALTER TABLE production_straps
ADD COLUMN IF NOT EXISTS calculated_weight NUMERIC(10,3);

-- Комментарии
COMMENT ON COLUMN production_straps.defect_weight IS 'Вес бракованной продукции в кг';
COMMENT ON COLUMN production_straps.calculated_weight IS 'Теоретический вес по спецификации в кг (для сравнения с фактическим)';

-- Обновляем существующие записи (если есть)
UPDATE production_straps
SET defect_weight = 0
WHERE defect_weight IS NULL;

-- Индекс для анализа брака
CREATE INDEX IF NOT EXISTS idx_production_straps_defect
ON production_straps(defect_weight)
WHERE defect_weight > 0;

-- =====================================================
-- VIEW: Статистика брака по стропам
-- =====================================================

CREATE OR REPLACE VIEW view_straps_defect_stats AS
SELECT
  strap_type_id,
  DATE_TRUNC('month', date) as month,

  -- Производство
  COUNT(*) as production_count,
  SUM(produced_length) as total_length,
  SUM(produced_weight) as total_weight,
  SUM(calculated_weight) as total_calc_weight,

  -- Брак
  SUM(defect_weight) as total_defect,
  AVG(defect_weight) as avg_defect,

  -- Процент брака
  CASE
    WHEN SUM(produced_weight) > 0
    THEN ROUND((SUM(defect_weight) / SUM(produced_weight) * 100)::numeric, 2)
    ELSE 0
  END as defect_percentage,

  -- Отклонение от спецификации
  CASE
    WHEN SUM(calculated_weight) > 0
    THEN ROUND(((SUM(produced_weight) - SUM(calculated_weight)) / SUM(calculated_weight) * 100)::numeric, 2)
    ELSE 0
  END as weight_deviation_percentage

FROM production_straps
WHERE date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY strap_type_id, DATE_TRUNC('month', date)
ORDER BY month DESC, strap_type_id;

COMMENT ON VIEW view_straps_defect_stats IS 'Статистика брака и отклонений веса в производстве строп';

-- =====================================================
-- ГОТОВО!
-- =====================================================

SELECT 'Defect weight columns added successfully!' AS message;
