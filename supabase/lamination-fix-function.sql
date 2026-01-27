-- Пересоздание функции process_lamination без списания сырья

DROP FUNCTION IF EXISTS process_lamination;

CREATE OR REPLACE FUNCTION process_lamination(
  p_date DATE,
  p_shift VARCHAR,
  p_machine_id UUID,
  p_operator_id UUID,

  p_input_roll_id UUID,
  p_input_length NUMERIC,
  p_input_weight NUMERIC,

  p_output_length NUMERIC,
  p_output_weight NUMERIC,
  p_waste NUMERIC,

  p_dosators JSONB,
  p_notes TEXT
)
RETURNS JSON AS $$
DECLARE
  v_doc_number VARCHAR(50);
  v_production_id UUID;
  v_new_roll_number VARCHAR(50);
  v_new_roll_id UUID;
  v_source_roll_number VARCHAR(50);
  v_dosator JSONB;
BEGIN
  -- 1. Генерируем номер документа
  v_doc_number := 'LAM-' || TO_CHAR(p_date, 'YYYYMMDD') || '-' || LPAD(NEXTVAL('doc_sequence')::TEXT, 4, '0');

  -- 2. Получаем номер исходного рулона
  SELECT roll_number INTO v_source_roll_number
  FROM weaving_rolls
  WHERE id = p_input_roll_id;

  IF v_source_roll_number IS NULL THEN
    RAISE EXCEPTION 'Рулон с ID % не найден', p_input_roll_id;
  END IF;

  -- 3. Создаем новый номер рулона (старый + LAM)
  v_new_roll_number := v_source_roll_number || '-LAM';

  -- 4. Создаем запись в журнале производства
  INSERT INTO production_lamination (
    doc_number, date, shift, machine_id, operator_id,
    input_roll_id, input_length, input_weight,
    output_length, output_weight, waste,
    dosators, notes
  ) VALUES (
    v_doc_number, p_date, p_shift, p_machine_id, p_operator_id,
    p_input_roll_id, p_input_length, p_input_weight,
    p_output_length, p_output_weight, p_waste,
    p_dosators, p_notes
  ) RETURNING id INTO v_production_id;

  -- 5. Списываем использованное сырье (дозаторы) через транзакции
  FOR v_dosator IN SELECT * FROM jsonb_array_elements(p_dosators)
  LOOP
    -- Создаем транзакцию расхода
    INSERT INTO inventory_transactions (
      type,
      doc_number,
      material_id,
      quantity,
      notes
    ) VALUES (
      'out',
      v_doc_number,
      (v_dosator->>'material_id')::UUID,
      -ABS((v_dosator->>'weight')::NUMERIC), -- Отрицательное значение для расхода
      'Списание на ламинацию'
    );
  END LOOP;

  -- 6. Обновляем статус исходного рулона (помечаем как использованный)
  UPDATE weaving_rolls
  SET status = 'used'
  WHERE id = p_input_roll_id;

  -- 7. Создаем новый ламинированный рулон
  INSERT INTO laminated_rolls (
    roll_number, production_id, source_roll_id,
    length, weight, status
  ) VALUES (
    v_new_roll_number, v_production_id, p_input_roll_id,
    p_output_length, p_output_weight, 'available'
  ) RETURNING id INTO v_new_roll_id;

  -- 8. Возвращаем результат
  RETURN json_build_object(
    'success', true,
    'production_id', v_production_id,
    'doc_number', v_doc_number,
    'new_roll_id', v_new_roll_id,
    'new_roll_number', v_new_roll_number
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Ошибка при обработке ламинации: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;
