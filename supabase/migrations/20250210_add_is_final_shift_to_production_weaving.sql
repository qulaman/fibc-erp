-- Добавляем поле is_final_shift в таблицу production_weaving
-- Это поле показывает, была ли эта запись смены завершающей для рулона

ALTER TABLE production_weaving
ADD COLUMN IF NOT EXISTS is_final_shift BOOLEAN DEFAULT FALSE;

-- Добавляем комментарий для ясности
COMMENT ON COLUMN production_weaving.is_final_shift IS 'Была ли это завершающая смена для рулона (когда рулон снят со станка)';

-- Для существующих записей: помечаем как финальные те, где рулон сейчас в статусе completed
-- и это последняя запись для данного рулона
UPDATE production_weaving pw
SET is_final_shift = TRUE
WHERE EXISTS (
  SELECT 1
  FROM weaving_rolls wr
  WHERE wr.id = pw.roll_id
    AND wr.status = 'completed'
)
AND pw.created_at = (
  SELECT MAX(created_at)
  FROM production_weaving pw2
  WHERE pw2.roll_id = pw.roll_id
);
