-- ============================================================================
-- ИСПРАВЛЕНИЕ ФУНКЦИИ СПИСАНИЯ СЫРЬЯ
-- ============================================================================
-- Работает с системой транзакций (inventory_transactions), а не с raw_materials_inventory

DROP FUNCTION IF EXISTS update_raw_material_balance(UUID, NUMERIC);

CREATE OR REPLACE FUNCTION update_raw_material_balance(
  p_material_id UUID,
  p_quantity_change NUMERIC
)
RETURNS JSON AS $$
DECLARE
  v_current_balance NUMERIC;
  v_material_name TEXT;
  v_transaction_type TEXT;
  v_doc_number TEXT;
BEGIN
  -- Получаем текущий баланс и название материала
  SELECT
    vmb.current_balance,
    rm.name
  INTO v_current_balance, v_material_name
  FROM view_material_balances vmb
  JOIN raw_materials rm ON vmb.id = rm.id
  WHERE vmb.id = p_material_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Материал не найден в справочнике сырья'
    );
  END IF;

  -- Определяем тип транзакции
  IF p_quantity_change > 0 THEN
    v_transaction_type := 'in';
  ELSE
    v_transaction_type := 'out';

    -- Проверка: нельзя списать больше, чем есть
    IF v_current_balance < ABS(p_quantity_change) THEN
      RETURN json_build_object(
        'success', false,
        'error', format('Недостаточно сырья "%s". Доступно: %s кг, требуется: %s кг',
          v_material_name, v_current_balance, ABS(p_quantity_change)),
        'material_name', v_material_name,
        'available', v_current_balance,
        'requested', ABS(p_quantity_change)
      );
    END IF;
  END IF;

  -- Генерируем номер документа
  v_doc_number := 'LAM-' || to_char(NOW(), 'YYYYMMDD-HH24MISS');

  -- Вставляем транзакцию
  INSERT INTO inventory_transactions (
    type,
    doc_number,
    material_id,
    quantity,
    counterparty,
    notes,
    created_at
  ) VALUES (
    v_transaction_type,
    v_doc_number,
    p_material_id,
    ABS(p_quantity_change),
    'Цех ламинации',
    'Автоматическое списание при ламинации',
    NOW()
  );

  -- Возвращаем результат
  RETURN json_build_object(
    'success', true,
    'material_name', v_material_name,
    'old_balance', v_current_balance,
    'new_balance', v_current_balance + p_quantity_change,
    'change', p_quantity_change,
    'doc_number', v_doc_number
  );
END;
$$ LANGUAGE plpgsql;

-- Комментарий
COMMENT ON FUNCTION update_raw_material_balance IS
'Списание/приход сырья через систему транзакций. Положительное значение - приход, отрицательное - расход';

-- ============================================================================
-- ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ
-- ============================================================================
-- Списание 50 кг сырья (дозатор):
-- SELECT update_raw_material_balance('uuid-материала', -50);
--
-- Приход 100 кг сырья:
-- SELECT update_raw_material_balance('uuid-материала', 100);
