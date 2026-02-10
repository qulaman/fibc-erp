-- ============================================================================
-- ФУНКЦИИ ДЛЯ ПЕРЕНОСА ЛАМИНИРОВАННЫХ РУЛОНОВ В КРОЙ И ОБРАТНО
-- ============================================================================

-- 1. Функция переноса ламинированного рулона в крой
CREATE OR REPLACE FUNCTION move_laminated_roll_to_cutting(p_roll_id UUID)
RETURNS JSON AS $$
DECLARE
  v_roll_record laminated_rolls%ROWTYPE;
BEGIN
  SELECT * INTO v_roll_record FROM laminated_rolls WHERE id = p_roll_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Рулон не найден');
  END IF;

  IF v_roll_record.status != 'available' THEN
    RETURN json_build_object('success', false, 'error', 'Рулон должен быть доступен');
  END IF;

  IF v_roll_record.location != 'lamination' THEN
    RETURN json_build_object('success', false, 'error', 'Рулон уже перемещён');
  END IF;

  IF v_roll_record.weight <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Рулон пустой');
  END IF;

  UPDATE laminated_rolls SET location = 'cutting' WHERE id = p_roll_id;

  RETURN json_build_object(
    'success', true,
    'roll_number', v_roll_record.roll_number,
    'message', 'Ламинированный рулон перемещён в кроечный цех'
  );
END;
$$ LANGUAGE plpgsql;

-- 2. Функция возврата ламинированного рулона на склад ламинации
CREATE OR REPLACE FUNCTION return_laminated_roll_to_lamination(p_roll_id UUID)
RETURNS JSON AS $$
DECLARE
  v_roll_record laminated_rolls%ROWTYPE;
BEGIN
  SELECT * INTO v_roll_record FROM laminated_rolls WHERE id = p_roll_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Рулон не найден');
  END IF;

  IF v_roll_record.location != 'cutting' THEN
    RETURN json_build_object('success', false, 'error', 'Рулон не в кроечном цехе');
  END IF;

  UPDATE laminated_rolls SET location = 'lamination' WHERE id = p_roll_id;

  RETURN json_build_object('success', true, 'message', 'Рулон возвращён на склад ламинации');
END;
$$ LANGUAGE plpgsql;

-- Комментарии
COMMENT ON FUNCTION move_laminated_roll_to_cutting IS 'Переносит ламинированный рулон из склада ламинации в кроечный цех';
COMMENT ON FUNCTION return_laminated_roll_to_lamination IS 'Возвращает ламинированный рулон из кроечного цеха на склад ламинации';
