-- ============================================================================
-- ФУНКЦИЯ ДЛЯ ОБНОВЛЕНИЯ БАЛАНСА СЫРЬЯ
-- ============================================================================
-- Используется для списания сырья при производстве (ламинация, экструзия, и т.д.)

CREATE OR REPLACE FUNCTION update_raw_material_balance(
  p_material_id UUID,
  p_quantity_change NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_material_name TEXT;
BEGIN
  -- Получаем текущий баланс и название материала
  SELECT balance_kg, material_name
  INTO v_current_balance, v_material_name
  FROM raw_materials_inventory
  WHERE id = p_material_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Материал не найден в справочнике сырья'
    );
  END IF;

  -- Вычисляем новый баланс
  v_new_balance := v_current_balance + p_quantity_change;

  -- Проверка: нельзя уйти в минус
  IF v_new_balance < 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Недостаточно сырья. Доступно: %s кг, требуется: %s кг',
        v_current_balance, ABS(p_quantity_change)),
      'material_name', v_material_name,
      'available', v_current_balance,
      'requested', ABS(p_quantity_change)
    );
  END IF;

  -- Обновляем баланс
  UPDATE raw_materials_inventory
  SET
    balance_kg = v_new_balance,
    updated_at = NOW()
  WHERE id = p_material_id;

  RETURN json_build_object(
    'success', true,
    'material_name', v_material_name,
    'old_balance', v_current_balance,
    'new_balance', v_new_balance,
    'change', p_quantity_change
  );
END;
$$ LANGUAGE plpgsql;

-- Комментарий
COMMENT ON FUNCTION update_raw_material_balance IS
'Обновляет баланс сырья. Положительное значение - приход, отрицательное - расход (списание)';

-- ============================================================================
-- ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
-- ============================================================================
-- Списание 50 кг сырья:
-- SELECT update_raw_material_balance('uuid-материала', -50);
--
-- Приход 100 кг сырья:
-- SELECT update_raw_material_balance('uuid-материала', 100);
