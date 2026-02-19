Initialising login role...
Dumping schemas from remote database...



SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."employee_role" AS ENUM (
    'manager',
    'operator_extruder',
    'operator_winder',
    'technologist',
    'operator_lamination',
    'operator_straps'
);


ALTER TYPE "public"."employee_role" OWNER TO "postgres";


COMMENT ON TYPE "public"."employee_role" IS 'Роли сотрудников: admin, manager_warehouse, operator_extruder, operator_winder, operator_weaver, operator_lamination, operator_cutting, operator_sewing';



CREATE OR REPLACE FUNCTION "public"."add_fabric_to_inventory"("p_roll_number" character varying, "p_fabric_type_id" "uuid", "p_length" numeric, "p_weight" numeric, "p_linked_doc" character varying) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO fabric_inventory (
    doc_number,
    date,
    time,
    operation_type,
    roll_number,
    fabric_type_id,
    length_meters,
    weight_kg,
    linked_doc,
    status
  ) VALUES (
    'RCP-' || to_char(NOW(), 'YYMMDD-HH24MISS'),
    CURRENT_DATE,
    CURRENT_TIME,
    'Приход',
    p_roll_number,
    p_fabric_type_id,
    p_length,
    p_weight,
    p_linked_doc,
    'Завершен'
  );
END;
$$;


ALTER FUNCTION "public"."add_fabric_to_inventory"("p_roll_number" character varying, "p_fabric_type_id" "uuid", "p_length" numeric, "p_weight" numeric, "p_linked_doc" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_yarn_to_inventory"("p_yarn_type_id" "uuid", "p_batch_number" "text", "p_bobbins" integer, "p_weight" numeric) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
begin
  insert into yarn_inventory (yarn_type_id, batch_number, bobbin_count, quantity_kg)
  values (p_yarn_type_id, p_batch_number, p_bobbins, p_weight)
  on conflict (yarn_type_id, batch_number)
  do update set
    bobbin_count = yarn_inventory.bobbin_count + excluded.bobbin_count,
    quantity_kg = yarn_inventory.quantity_kg + excluded.quantity_kg,
    last_updated = now();
end;
$$;


ALTER FUNCTION "public"."add_yarn_to_inventory"("p_yarn_type_id" "uuid", "p_batch_number" "text", "p_bobbins" integer, "p_weight" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."auto_create_strap_warehouse_entry"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_roll_number VARCHAR(100);
  v_strap_code VARCHAR(50);
BEGIN
  SELECT code INTO v_strap_code FROM strap_types WHERE id = NEW.strap_type_id;
  v_roll_number := 'STRAP-' || TO_CHAR(NEW.date, 'YYYYMMDD') || '-' || COALESCE(v_strap_code, 'UNKNOWN') || '-' || SUBSTRING(NEW.id::TEXT, 1, 8);

  INSERT INTO straps_warehouse (
    roll_number, production_id, strap_type_id,
    produced_length, produced_weight, length, weight, status
  ) VALUES (
    v_roll_number, NEW.id, NEW.strap_type_id,
    NEW.produced_length, NEW.produced_weight,
    NEW.produced_length, NEW.produced_weight, 'available'
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_create_strap_warehouse_entry"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."consume_yarn_for_weaving"("p_yarn_code" character varying, "p_batch" character varying, "p_quantity" numeric, "p_linked_doc" character varying) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_yarn_type_id UUID;
BEGIN
  -- Находим ID типа нити по коду
  SELECT id INTO v_yarn_type_id
  FROM yarn_types
  WHERE code = p_yarn_code
  LIMIT 1;

  IF v_yarn_type_id IS NULL THEN
    RAISE EXCEPTION 'Тип нити % не найден', p_yarn_code;
  END IF;

  -- Записываем расход
  INSERT INTO yarn_inventory (
    doc_number,
    date,
    time,
    operation_type,
    yarn_type_id,
    batch_number,
    weight_kg,
    linked_doc,
    notes,
    status
  ) VALUES (
    'EXP-' || to_char(NOW(), 'YYMMDD-HH24MISS'),
    CURRENT_DATE,
    CURRENT_TIME,
    'Расход',
    v_yarn_type_id,
    p_batch,
    p_quantity,
    p_linked_doc,
    'Ткачество',
    'Завершен'
  );
END;
$$;


ALTER FUNCTION "public"."consume_yarn_for_weaving"("p_yarn_code" character varying, "p_batch" character varying, "p_quantity" numeric, "p_linked_doc" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_lab_doc_number"("p_prefix" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_seq INTEGER;
  v_date TEXT;
BEGIN
  v_date := TO_CHAR(NOW(), 'YYYYMMDD');
  SELECT COUNT(*) + 1 INTO v_seq FROM lab_tests WHERE doc_number LIKE p_prefix || '-' || v_date || '-%';
  RETURN p_prefix || '-' || v_date || '-' || LPAD(v_seq::TEXT, 4, '0');
END;
$$;


ALTER FUNCTION "public"."generate_lab_doc_number"("p_prefix" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_defect_statistics"("p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("workshop" "text", "defect_type" "text", "total_quantity" numeric, "unit" "text", "material_type" "text", "count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.workshop,
    d.defect_type,
    SUM(d.quantity) as total_quantity,
    d.unit,
    d.material_type,
    COUNT(*) as count
  FROM defect_materials d
  WHERE
    (p_start_date IS NULL OR d.created_at >= p_start_date)
    AND (p_end_date IS NULL OR d.created_at <= p_end_date)
  GROUP BY d.workshop, d.defect_type, d.unit, d.material_type
  ORDER BY d.workshop, total_quantity DESC;
END;
$$;


ALTER FUNCTION "public"."get_defect_statistics"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_my_role"() RETURNS character varying
    LANGUAGE "sql" STABLE SECURITY DEFINER
    AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_my_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"() RETURNS character varying
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$;


ALTER FUNCTION "public"."get_user_role"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_waste_statistics"("p_start_date" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_end_date" timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE("workshop" "text", "total_quantity" numeric, "unit" "text", "material_type" "text", "count" bigint)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    w.workshop,
    SUM(w.quantity) as total_quantity,
    w.unit,
    w.material_type,
    COUNT(*) as count
  FROM waste_materials w
  WHERE
    (p_start_date IS NULL OR w.created_at >= p_start_date)
    AND (p_end_date IS NULL OR w.created_at <= p_end_date)
  GROUP BY w.workshop, w.unit, w.material_type
  ORDER BY w.workshop, total_quantity DESC;
END;
$$;


ALTER FUNCTION "public"."get_waste_statistics"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, is_active)
  VALUES (NEW.id, 'operator', true);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("required_role" character varying) RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = required_role
    AND is_active = true
  );
$$;


ALTER FUNCTION "public"."has_role"("required_role" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."move_laminated_roll_to_cutting"("p_roll_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_roll_record laminated_rolls%ROWTYPE;
BEGIN
  -- Проверяем существование и статус рулона
  SELECT * INTO v_roll_record
  FROM laminated_rolls
  WHERE id = p_roll_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Ламинированный рулон не найден'
    );
  END IF;

  IF v_roll_record.status != 'available' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Рулон должен быть доступен (status = available)'
    );
  END IF;

  IF v_roll_record.location != 'lamination' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Рулон уже перемещён (' || v_roll_record.location || ')'
    );
  END IF;

  -- Перемещаем рулон в крой
  UPDATE laminated_rolls
  SET location = 'cutting'
  WHERE id = p_roll_id;

  RETURN json_build_object(
    'success', true,
    'roll_number', v_roll_record.roll_number,
    'message', 'Ламинированный рулон перемещён в кроечный цех'
  );
END;
$$;


ALTER FUNCTION "public"."move_laminated_roll_to_cutting"("p_roll_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."move_laminated_roll_to_cutting"("p_roll_id" "uuid") IS 'Перемещает ламинированный рулон из склада ламинации в кроечный цех';



CREATE OR REPLACE FUNCTION "public"."move_roll_to_cutting"("p_roll_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_roll_record weaving_rolls%ROWTYPE;
BEGIN
  -- Проверяем существование и статус рулона
  SELECT * INTO v_roll_record
  FROM weaving_rolls
  WHERE id = p_roll_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Рулон не найден'
    );
  END IF;

  IF v_roll_record.status != 'completed' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Рулон должен быть завершён (status = completed)'
    );
  END IF;

  IF v_roll_record.location != 'weaving' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Рулон уже перемещён (' || v_roll_record.location || ')'
    );
  END IF;

  -- Перемещаем рулон в крой
  UPDATE weaving_rolls
  SET location = 'cutting'
  WHERE id = p_roll_id;

  RETURN json_build_object(
    'success', true,
    'roll_number', v_roll_record.roll_number,
    'message', 'Рулон перемещён в кроечный цех'
  );
END;
$$;


ALTER FUNCTION "public"."move_roll_to_cutting"("p_roll_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."move_roll_to_cutting"("p_roll_id" "uuid") IS 'Перемещает рулон из ткачества в кроечный цех. Проверяет статус и локацию.';



CREATE OR REPLACE FUNCTION "public"."process_lamination"("p_date" "date", "p_shift" character varying, "p_machine_id" "uuid", "p_operator_id" "uuid", "p_input_roll_id" "uuid", "p_input_length" numeric, "p_input_weight" numeric, "p_output_length" numeric, "p_output_weight" numeric, "p_waste" numeric, "p_dosators" "jsonb", "p_notes" "text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."process_lamination"("p_date" "date", "p_shift" character varying, "p_machine_id" "uuid", "p_operator_id" "uuid", "p_input_roll_id" "uuid", "p_input_length" numeric, "p_input_weight" numeric, "p_output_length" numeric, "p_output_weight" numeric, "p_waste" numeric, "p_dosators" "jsonb", "p_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."register_extrusion_output"("p_date" "date", "p_shift" "text", "p_machine_id" "uuid", "p_operator_id" "uuid", "p_yarn_name" "text", "p_yarn_denier" integer, "p_width_mm" numeric, "p_color" "text", "p_batch_number" "text", "p_weight_kg" numeric, "p_operator_winder1" "uuid" DEFAULT NULL::"uuid", "p_operator_winder2" "uuid" DEFAULT NULL::"uuid", "p_operator_winder3" "uuid" DEFAULT NULL::"uuid", "p_notes" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_production_id UUID;
    v_yarn_warehouse_id UUID;
    v_doc_number TEXT;
BEGIN
    -- Генерация номера документа
    v_doc_number := 'EXT-' || TO_CHAR(p_date, 'YYMMDD') || '-' ||
                    LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');

    -- Вставка записи в production_extrusion
    INSERT INTO production_extrusion (
        doc_number,
        date,
        shift,
        machine_id,
        operator_extruder_id,
        operator_winder1_id,
        operator_winder2_id,
        operator_winder3_id,
        yarn_name,
        yarn_denier,
        yarn_width_mm,
        yarn_color,
        batch_number,
        output_weight_net,
        notes
    ) VALUES (
        v_doc_number,
        p_date,
        p_shift,
        p_machine_id,
        p_operator_id,
        p_operator_winder1,
        p_operator_winder2,
        p_operator_winder3,
        p_yarn_name,
        p_yarn_denier,
        p_width_mm,
        p_color,
        p_batch_number,
        p_weight_kg,
        p_notes
    )
    RETURNING id INTO v_production_id;

    -- Добавление на склад нити (yarn_warehouse)
    -- Проверяем, есть ли уже такая партия
    SELECT id INTO v_yarn_warehouse_id
    FROM yarn_warehouse
    WHERE batch_number = p_batch_number
    LIMIT 1;

    IF v_yarn_warehouse_id IS NOT NULL THEN
        -- Обновляем существующую запись
        UPDATE yarn_warehouse
        SET balance_kg = balance_kg + p_weight_kg,
            updated_at = NOW()
        WHERE id = v_yarn_warehouse_id;
    ELSE
        -- Создаем новую запись
        INSERT INTO yarn_warehouse (
            yarn_name,
            yarn_denier,
            width_mm,
            color,
            batch_number,
            balance_kg,
            unit
        ) VALUES (
            p_yarn_name,
            p_yarn_denier,
            p_width_mm,
            p_color,
            p_batch_number,
            p_weight_kg,
            'kg'
        )
        RETURNING id INTO v_yarn_warehouse_id;
    END IF;

    -- Возвращаем результат
    RETURN json_build_object(
        'success', true,
        'production_id', v_production_id,
        'yarn_warehouse_id', v_yarn_warehouse_id,
        'doc_number', v_doc_number,
        'message', 'Партия успешно зарегистрирована'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM,
            'message', 'Ошибка при регистрации партии'
        );
END;
$$;


ALTER FUNCTION "public"."register_extrusion_output"("p_date" "date", "p_shift" "text", "p_machine_id" "uuid", "p_operator_id" "uuid", "p_yarn_name" "text", "p_yarn_denier" integer, "p_width_mm" numeric, "p_color" "text", "p_batch_number" "text", "p_weight_kg" numeric, "p_operator_winder1" "uuid", "p_operator_winder2" "uuid", "p_operator_winder3" "uuid", "p_notes" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."register_extrusion_output"("p_date" "date", "p_shift" "text", "p_machine_id" "uuid", "p_operator_id" "uuid", "p_yarn_name" "text", "p_yarn_denier" integer, "p_width_mm" numeric, "p_color" "text", "p_batch_number" "text", "p_weight_kg" numeric, "p_operator_winder1" "uuid", "p_operator_winder2" "uuid", "p_operator_winder3" "uuid", "p_notes" "text") IS 'Регистрирует выпуск партии экструзии с поддержкой трех намотчиков';



CREATE OR REPLACE FUNCTION "public"."register_weaving_log"("p_date" "date", "p_shift" "text", "p_roll_id" "uuid", "p_operator_id" "uuid", "p_length" numeric, "p_weight" numeric, "p_notes" "text", "p_is_finished" boolean) RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    v_roll record;
    v_spec record;
    v_total_length numeric; -- Общая длина рулона
    v_warp_needed numeric;
    v_weft_needed numeric;
BEGIN
    -- 1. Сначала обновляем сам рулон (накапливаем длину и вес)
    -- И сразу получаем обновленные данные через RETURNING
    UPDATE weaving_rolls
    SET 
        total_length = COALESCE(total_length, 0) + p_length,
        total_weight = COALESCE(total_weight, 0) + p_weight,
        status = CASE WHEN p_is_finished THEN 'completed' ELSE 'active' END,
        updated_at = now()
    WHERE id = p_roll_id
    RETURNING id, total_length, fabric_spec_id, warp_batch_id, weft_batch_id INTO v_roll;

    -- 2. Записываем смену в журнал (Просто история: кто, когда, сколько добавил)
    INSERT INTO production_weaving (
        date, shift, roll_id, operator_id, 
        produced_length, produced_weight, notes,
        -- В журнал пишем 0 расхода, так как списания еще нет (или можно писать расчетный)
        warp_usage_kg, weft_usage_kg 
    ) VALUES (
        p_date, p_shift, p_roll_id, p_operator_id, 
        p_length, p_weight, p_notes,
        0, 0 -- Пока ставим 0, спишем в конце
    );

    -- 3. ГЛАВНОЕ ИЗМЕНЕНИЕ: Списание ТОЛЬКО если рулон закончен
    IF p_is_finished THEN
        
        -- Получаем спецификацию
        SELECT * INTO v_spec FROM tkan_specifications WHERE id = v_roll.fabric_spec_id;
        
        -- Считаем расход на ВЕСЬ рулон (Общая длина * норма)
        v_warp_needed := v_roll.total_length * COALESCE(v_spec.osnova_itogo_kg, 0);
        v_weft_needed := v_roll.total_length * COALESCE(v_spec.utok_itogo_kg, 0);

        -- Списываем ОСНОВУ со склада
        IF v_roll.warp_batch_id IS NOT NULL THEN
            UPDATE yarn_inventory 
            SET quantity_kg = quantity_kg - v_warp_needed
            WHERE id = v_roll.warp_batch_id;
        END IF;

        -- Списываем УТОК со склада
        IF v_roll.weft_batch_id IS NOT NULL THEN
            UPDATE yarn_inventory 
            SET quantity_kg = quantity_kg - v_weft_needed
            WHERE id = v_roll.weft_batch_id;
        END IF;

        -- (Опционально) Обновляем последнюю запись журнала, чтобы там был виден итоговый расход
        -- Но это не обязательно, главное что со склада ушло.
    END IF;

END;
$$;


ALTER FUNCTION "public"."register_weaving_log"("p_date" "date", "p_shift" "text", "p_roll_id" "uuid", "p_operator_id" "uuid", "p_length" numeric, "p_weight" numeric, "p_notes" "text", "p_is_finished" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."return_laminated_roll_to_lamination"("p_roll_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_roll_record laminated_rolls%ROWTYPE;
BEGIN
  SELECT * INTO v_roll_record
  FROM laminated_rolls
  WHERE id = p_roll_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Рулон не найден');
  END IF;

  IF v_roll_record.location != 'cutting' THEN
    RETURN json_build_object('success', false, 'error', 'Рулон не в кроечном цехе');
  END IF;

  UPDATE laminated_rolls
  SET location = 'lamination'
  WHERE id = p_roll_id;

  RETURN json_build_object('success', true, 'message', 'Рулон возвращён на склад ламинации');
END;
$$;


ALTER FUNCTION "public"."return_laminated_roll_to_lamination"("p_roll_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."return_laminated_roll_to_lamination"("p_roll_id" "uuid") IS 'Возвращает ламинированный рулон из кроечного цеха обратно на склад ламинации';



CREATE OR REPLACE FUNCTION "public"."return_roll_to_weaving"("p_roll_id" "uuid") RETURNS json
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_roll_record weaving_rolls%ROWTYPE;
BEGIN
  SELECT * INTO v_roll_record
  FROM weaving_rolls
  WHERE id = p_roll_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Рулон не найден');
  END IF;

  IF v_roll_record.location != 'cutting' THEN
    RETURN json_build_object('success', false, 'error', 'Рулон не в кроечном цехе');
  END IF;

  UPDATE weaving_rolls
  SET location = 'weaving'
  WHERE id = p_roll_id;

  RETURN json_build_object('success', true, 'message', 'Рулон возвращён на склад ткачества');
END;
$$;


ALTER FUNCTION "public"."return_roll_to_weaving"("p_roll_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."return_roll_to_weaving"("p_roll_id" "uuid") IS 'Возвращает рулон из кроечного цеха обратно на склад ткачества';



CREATE OR REPLACE FUNCTION "public"."set_admin_by_email"("user_email" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;

  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;

  UPDATE user_profiles SET role = 'admin', is_active = true WHERE id = user_id;
END;
$$;


ALTER FUNCTION "public"."set_admin_by_email"("user_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_printing_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_printing_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "batch_number" "text" NOT NULL,
    "product_id" "uuid",
    "initial_quantity" numeric NOT NULL,
    "current_quantity" numeric NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "parent_batches" "uuid"[]
);


ALTER TABLE "public"."batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."custom_cutting_sizes" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "production_cutting_id" "uuid",
    "width_cm" numeric(10,2),
    "length_cm" numeric(10,2),
    "consumption_cm" numeric(10,2) NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."custom_cutting_sizes" OWNER TO "postgres";


COMMENT ON TABLE "public"."custom_cutting_sizes" IS 'Произвольные размеры кроя, не из справочника cutting_types';



CREATE TABLE IF NOT EXISTS "public"."customer_orders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_number" "text" NOT NULL,
    "client_name" "text" NOT NULL,
    "specs" "jsonb",
    "status" "text" DEFAULT 'planned'::"text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."customer_orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cutting_parts_warehouse" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "doc_number" "text" NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "time" time without time zone DEFAULT CURRENT_TIME NOT NULL,
    "operation" "text" NOT NULL,
    "cutting_type_code" "text" NOT NULL,
    "cutting_type_name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "source_number" "text",
    "operator" "text",
    "status" "text" DEFAULT 'Проведено'::"text",
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "cutting_parts_warehouse_operation_check" CHECK (("operation" = ANY (ARRAY['Приход'::"text", 'Расход'::"text"]))),
    CONSTRAINT "cutting_parts_warehouse_status_check" CHECK (("status" = ANY (ARRAY['Черновик'::"text", 'Проведено'::"text", 'Отменено'::"text"])))
);


ALTER TABLE "public"."cutting_parts_warehouse" OWNER TO "postgres";


COMMENT ON TABLE "public"."cutting_parts_warehouse" IS 'Складской учет кроеных деталей';



COMMENT ON COLUMN "public"."cutting_parts_warehouse"."operation" IS 'Приход - оприходование, Расход - отпуск в пошив';



COMMENT ON COLUMN "public"."cutting_parts_warehouse"."source_number" IS 'Номер рулона-источника (для прихода) или номер документа (для расхода)';



CREATE OR REPLACE VIEW "public"."cutting_parts_balance" AS
 SELECT "cutting_type_code",
    "cutting_type_name",
    "category",
    "sum"(
        CASE
            WHEN ("operation" = 'Приход'::"text") THEN "quantity"
            ELSE 0
        END) AS "total_received",
    "sum"(
        CASE
            WHEN ("operation" = 'Расход'::"text") THEN "quantity"
            ELSE 0
        END) AS "total_used",
    "sum"(
        CASE
            WHEN ("operation" = 'Приход'::"text") THEN "quantity"
            ELSE (- "quantity")
        END) AS "balance"
   FROM "public"."cutting_parts_warehouse"
  WHERE ("status" = 'Проведено'::"text")
  GROUP BY "cutting_type_code", "cutting_type_name", "category"
 HAVING ("sum"(
        CASE
            WHEN ("operation" = 'Приход'::"text") THEN "quantity"
            ELSE (- "quantity")
        END) > 0);


ALTER VIEW "public"."cutting_parts_balance" OWNER TO "postgres";


COMMENT ON VIEW "public"."cutting_parts_balance" IS 'Текущие остатки кроеных деталей на складе';



CREATE TABLE IF NOT EXISTS "public"."tkan_specifications" (
    "id" integer NOT NULL,
    "kod_tkani" character varying(50),
    "nazvanie_tkani" character varying(100) NOT NULL,
    "shirina_polotna_sm" integer NOT NULL,
    "plotnost_polotna_gr_m2" integer NOT NULL,
    "tip" character varying(20) NOT NULL,
    "osobennosti_polotna" character varying(50),
    "osnova_denye" integer,
    "osnova_shirina_niti_sm" numeric(5,2),
    "osnova_plotnost_na_10sm" integer,
    "utok_denye" integer,
    "utok_shirina_niti_sm" numeric(5,2),
    "utok_plotnost_na_10sm" integer,
    "math_plotnost_gr_m2" numeric(12,6),
    "razryv_po_osnove_kg_s" numeric(10,2),
    "elastichnost_po_osnove" character varying(20),
    "razryv_po_utku_kg_s" numeric(10,2),
    "elastichnost_po_utku" character varying(20),
    "ves_1_pogonnogo_m_gr" numeric(10,2),
    "shirina_v_razvorote_mm" integer,
    "shirina_v_razvorote_m" numeric(5,2),
    "udelny_ves_m" numeric(10,2),
    "percent_othodov" numeric(5,4),
    "perevod_gr_na_kg" numeric(10,6),
    "osnova_kol_nitey_shpulyarnik" integer,
    "osnova_ves_9m_gr" numeric(10,2),
    "osnova_itogo_kg" numeric(12,6),
    "utok_kol_nitey_shpulyarnik" integer,
    "utok_ves_9m_gr" numeric(10,2),
    "utok_itogo_kg" numeric(12,6),
    "receptura_itogo_percent" numeric(12,6),
    "receptura_pp_kg" numeric(12,6),
    "receptura_karbonat_kg" numeric(12,6),
    "receptura_uf_stabilizator_kg" numeric(12,6),
    "receptura_krasitel_kg" numeric(12,6),
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "is_colored" boolean DEFAULT false,
    "color_name" character varying(100)
);


ALTER TABLE "public"."tkan_specifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."tkan_specifications" IS 'Справочник спецификаций тканей для производства биг-бэгов';



COMMENT ON COLUMN "public"."tkan_specifications"."nazvanie_tkani" IS 'Название ткани в формате: РПП [ширина] см-[плотность] гр/м2';



COMMENT ON COLUMN "public"."tkan_specifications"."tip" IS 'Тип полотна: рукав или фальц';



COMMENT ON COLUMN "public"."tkan_specifications"."osobennosti_polotna" IS 'Особенности плетения: обычное или шахматное';



COMMENT ON COLUMN "public"."tkan_specifications"."is_colored" IS 'Признак цветной ткани (TRUE = цветная, FALSE = натуральная)';



COMMENT ON COLUMN "public"."tkan_specifications"."color_name" IS 'Название цвета (бежевый, синий, зелёный и т.д.)';



CREATE TABLE IF NOT EXISTS "public"."weaving_rolls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "roll_number" "text" NOT NULL,
    "loom_id" "uuid",
    "fabric_spec_id" bigint,
    "status" "text" DEFAULT 'active'::"text",
    "total_length" numeric DEFAULT 0,
    "total_weight" numeric DEFAULT 0,
    "warp_batch_id" "uuid",
    "weft_batch_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "location" "text" DEFAULT 'weaving'::"text",
    CONSTRAINT "weaving_rolls_location_check" CHECK (("location" = ANY (ARRAY['weaving'::"text", 'lamination'::"text", 'cutting'::"text", 'warehouse'::"text", 'used'::"text"])))
);


ALTER TABLE "public"."weaving_rolls" OWNER TO "postgres";


COMMENT ON COLUMN "public"."weaving_rolls"."location" IS 'Текущая локация рулона: weaving (на станке/складе ткачества), lamination (в ламинации), cutting (в кроечном цехе), warehouse (общий склад), used (использован полностью)';



CREATE OR REPLACE VIEW "public"."cutting_rolls_available" AS
 SELECT "wr"."id",
    "wr"."roll_number",
    "wr"."total_length" AS "balance_m",
    "wr"."total_weight" AS "balance_kg",
    "wr"."status",
    "wr"."location",
    "wr"."created_at",
    "ts"."kod_tkani" AS "fabric_code",
    "ts"."nazvanie_tkani" AS "fabric_name",
    "ts"."shirina_polotna_sm" AS "fabric_width_cm"
   FROM ("public"."weaving_rolls" "wr"
     LEFT JOIN "public"."tkan_specifications" "ts" ON (("wr"."fabric_spec_id" = "ts"."id")))
  WHERE (("wr"."location" = 'cutting'::"text") AND ("wr"."status" = ANY (ARRAY['completed'::"text", 'active'::"text"])) AND ("wr"."total_length" > (0)::numeric))
  ORDER BY "wr"."created_at" DESC;


ALTER VIEW "public"."cutting_rolls_available" OWNER TO "postgres";


COMMENT ON VIEW "public"."cutting_rolls_available" IS 'Рулоны, находящиеся в кроечном цехе и доступные для работы';



CREATE TABLE IF NOT EXISTS "public"."cutting_types" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code" "text" NOT NULL,
    "category" "text" NOT NULL,
    "name" "text" NOT NULL,
    "material_type" "text" NOT NULL,
    "width_cm" numeric(10,2),
    "length_cm" numeric(10,2),
    "consumption_cm" numeric(10,2) NOT NULL,
    "weight_g" numeric(10,2),
    "description" "text",
    "status" "text" DEFAULT 'Активно'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "cutting_types_material_type_check" CHECK (("material_type" = ANY (ARRAY['Ткань'::"text", 'Ткань/Ламинат'::"text", 'Ламинат'::"text", 'Стропа'::"text"]))),
    CONSTRAINT "cutting_types_status_check" CHECK (("status" = ANY (ARRAY['Активно'::"text", 'Неактивно'::"text"])))
);


ALTER TABLE "public"."cutting_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."cutting_types" IS 'Справочник заполнен тестовыми данными';



COMMENT ON COLUMN "public"."cutting_types"."code" IS 'Уникальный код детали';



COMMENT ON COLUMN "public"."cutting_types"."category" IS 'Категория детали (донышко, боковина, петля и т.д.)';



COMMENT ON COLUMN "public"."cutting_types"."material_type" IS 'Из какого материала кроится';



COMMENT ON COLUMN "public"."cutting_types"."consumption_cm" IS 'Расход материала на 1 деталь в сантиметрах';



CREATE TABLE IF NOT EXISTS "public"."defect_materials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "workshop" "text" NOT NULL,
    "material_type" "text" NOT NULL,
    "material_description" "text",
    "quantity" numeric(10,2) NOT NULL,
    "unit" "text" NOT NULL,
    "defect_type" "text" NOT NULL,
    "reason" "text",
    "notes" "text",
    "recorded_by" "uuid",
    CONSTRAINT "defect_materials_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "defect_materials_unit_check" CHECK (("unit" = ANY (ARRAY['kg'::"text", 'meters'::"text", 'pieces'::"text", 'rolls'::"text"]))),
    CONSTRAINT "defect_materials_workshop_check" CHECK (("workshop" = ANY (ARRAY['extrusion'::"text", 'weaving'::"text", 'lamination'::"text", 'cutting'::"text"])))
);


ALTER TABLE "public"."defect_materials" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."doc_sequence"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."doc_sequence" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employee_attendance" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "date" "date" NOT NULL,
    "employee_id" "uuid",
    "status" "text" DEFAULT 'present'::"text",
    "hours" numeric DEFAULT 12,
    "shift_type" "text" DEFAULT 'Day'::"text"
);


ALTER TABLE "public"."employee_attendance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "full_name" "text" NOT NULL,
    "role" character varying(100) NOT NULL,
    "shift_team" "text",
    "is_active" boolean DEFAULT true,
    "birth_date" "date",
    "department" character varying(50),
    "work_status" "text",
    CONSTRAINT "employees_work_status_check" CHECK (("work_status" = ANY (ARRAY['active'::"text", 'vacation'::"text", 'sick_leave'::"text"])))
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


COMMENT ON COLUMN "public"."employees"."role" IS 'Роль сотрудника (свободный текст): admin, manager_warehouse, operator_extruder, operator_winder, operator_weaver, operator_lamination, operator_cutting, operator_sewing';



COMMENT ON COLUMN "public"."employees"."birth_date" IS 'Дата рождения сотрудника';



COMMENT ON COLUMN "public"."employees"."department" IS 'Цех/подразделение: extrusion, weaving, lamination, straps, cutting, sewing, warehouse, admin, other';



COMMENT ON COLUMN "public"."employees"."work_status" IS 'Статус работы сотрудника: active, vacation, sick_leave';



CREATE TABLE IF NOT EXISTS "public"."equipment" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "code" "text" NOT NULL,
    "type" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "max_capacity_kg_h" numeric,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."equipment" OWNER TO "postgres";


COMMENT ON COLUMN "public"."equipment"."is_active" IS 'Активность оборудования (TRUE = активно, FALSE = выведено из эксплуатации)';



CREATE TABLE IF NOT EXISTS "public"."fabric_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doc_number" character varying(50) NOT NULL,
    "date" "date" NOT NULL,
    "time" time without time zone,
    "operation_type" character varying(20) NOT NULL,
    "roll_number" character varying(50),
    "fabric_type_id" "uuid",
    "length_meters" numeric(10,2) DEFAULT 0,
    "weight_kg" numeric(10,2) DEFAULT 0,
    "linked_doc" character varying(50),
    "counterparty" character varying(255),
    "status" character varying(20) DEFAULT 'Завершен'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "fabric_spec_id" integer,
    "fabric_code" character varying(50),
    "fabric_name" character varying(255)
);


ALTER TABLE "public"."fabric_inventory" OWNER TO "postgres";


COMMENT ON TABLE "public"."fabric_inventory" IS 'Складской учет ткани';



COMMENT ON COLUMN "public"."fabric_inventory"."fabric_spec_id" IS 'ID спецификации из tkan_specifications';



COMMENT ON COLUMN "public"."fabric_inventory"."fabric_code" IS 'Код ткани (дублируется для удобства)';



COMMENT ON COLUMN "public"."fabric_inventory"."fabric_name" IS 'Название ткани (дублируется для удобства)';



CREATE OR REPLACE VIEW "public"."fabric_stock_balance" AS
 SELECT "ts"."id" AS "fabric_type_id",
    "ts"."nazvanie_tkani" AS "name",
    "ts"."kod_tkani" AS "code",
    "ts"."shirina_polotna_sm" AS "width_cm",
    COALESCE("sum"("wr"."total_weight"), (0)::numeric) AS "balance_kg",
    COALESCE("sum"("wr"."total_length"), (0)::numeric) AS "balance_meters",
    COALESCE("sum"("wr"."total_weight"), (0)::numeric) AS "total_receipt_kg",
    0 AS "total_expense_kg"
   FROM ("public"."tkan_specifications" "ts"
     LEFT JOIN "public"."weaving_rolls" "wr" ON ((("ts"."id" = "wr"."fabric_spec_id") AND ("wr"."status" = 'completed'::"text"))))
  GROUP BY "ts"."id", "ts"."nazvanie_tkani", "ts"."kod_tkani", "ts"."shirina_polotna_sm"
 HAVING ((COALESCE("sum"("wr"."total_weight"), (0)::numeric) > (0)::numeric) OR (COALESCE("sum"("wr"."total_length"), (0)::numeric) > (0)::numeric));


ALTER VIEW "public"."fabric_stock_balance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."fabric_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "width_cm" numeric(10,2),
    "density" numeric(10,2),
    "color" character varying(100),
    "weft_yarn_code" character varying(50),
    "warp_yarn_code" character varying(50),
    "weft_consumption_per_meter" numeric(10,4) DEFAULT 0,
    "warp_consumption_per_meter" numeric(10,4) DEFAULT 0,
    "status" character varying(20) DEFAULT 'Активно'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."fabric_types" OWNER TO "postgres";


COMMENT ON TABLE "public"."fabric_types" IS 'Справочник типов тканей';



CREATE TABLE IF NOT EXISTS "public"."finished_goods_warehouse" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "doc_number" "text" NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "time" time without time zone DEFAULT CURRENT_TIME NOT NULL,
    "operation" "text" NOT NULL,
    "product_code" "text" NOT NULL,
    "product_name" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "source_doc" "text",
    "destination_client" "text",
    "status" "text" DEFAULT 'Проведено'::"text",
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "finished_goods_warehouse_operation_check" CHECK (("operation" = ANY (ARRAY['Приход'::"text", 'Расход'::"text", 'Возврат'::"text"]))),
    CONSTRAINT "finished_goods_warehouse_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."finished_goods_warehouse" OWNER TO "postgres";


COMMENT ON TABLE "public"."finished_goods_warehouse" IS 'Склад готовой продукции (мешки)';



CREATE TABLE IF NOT EXISTS "public"."inventory_transactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "type" "text" NOT NULL,
    "doc_number" "text" NOT NULL,
    "material_id" "uuid" NOT NULL,
    "quantity" numeric NOT NULL,
    "batch_number" "text",
    "counterparty" "text",
    "notes" "text",
    "user_id" "uuid",
    CONSTRAINT "inventory_transactions_type_check" CHECK (("type" = ANY (ARRAY['in'::"text", 'out'::"text"])))
);


ALTER TABLE "public"."inventory_transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lab_tests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "doc_number" "text" NOT NULL,
    "test_type" "text" NOT NULL,
    "operator" "text",
    "result" "text",
    "notes" "text",
    "test_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "recorded_by" "uuid",
    CONSTRAINT "lab_tests_result_check" CHECK (("result" = ANY (ARRAY['Годен'::"text", 'Брак'::"text", ''::"text"]))),
    CONSTRAINT "lab_tests_test_type_check" CHECK (("test_type" = ANY (ARRAY['yarn'::"text", 'extruder'::"text", 'machine'::"text", 'fabric'::"text", 'strap'::"text", 'lamination'::"text", 'mfi'::"text"])))
);


ALTER TABLE "public"."lab_tests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."laminated_rolls" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "roll_number" character varying(50) NOT NULL,
    "production_id" "uuid",
    "source_roll_id" "uuid",
    "length" numeric(10,2) NOT NULL,
    "weight" numeric(10,2) NOT NULL,
    "status" character varying(20) DEFAULT 'available'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "location" "text" DEFAULT 'lamination'::"text",
    CONSTRAINT "laminated_rolls_location_check" CHECK (("location" = ANY (ARRAY['lamination'::"text", 'cutting'::"text", 'warehouse'::"text", 'used'::"text"])))
);


ALTER TABLE "public"."laminated_rolls" OWNER TO "postgres";


COMMENT ON TABLE "public"."laminated_rolls" IS 'Склад ламинированных рулонов';



COMMENT ON COLUMN "public"."laminated_rolls"."location" IS 'Текущая локация ламинированного рулона: lamination (на складе ламинации), cutting (в кроечном цехе), warehouse (общий склад), used (использован полностью)';



CREATE TABLE IF NOT EXISTS "public"."mfn_warehouse" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doc_number" character varying(50) NOT NULL,
    "operation_date" "date" NOT NULL,
    "operation_time" time without time zone DEFAULT CURRENT_TIME NOT NULL,
    "operation_type" character varying(20) NOT NULL,
    "material_code" character varying(50) NOT NULL,
    "material_name" character varying(255) NOT NULL,
    "material_type" character varying(100) DEFAULT 'МФН'::character varying,
    "denier" numeric(10,2),
    "color" character varying(100),
    "quantity_kg" numeric(12,3) NOT NULL,
    "price_per_kg" numeric(12,2),
    "total_amount" numeric(15,2),
    "supplier_name" character varying(255),
    "invoice_number" character varying(100),
    "destination" character varying(255),
    "destination_doc" character varying(50),
    "responsible_person" character varying(255),
    "notes" "text",
    "status" character varying(20) DEFAULT 'Активно'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "mfn_warehouse_operation_type_check" CHECK ((("operation_type")::"text" = ANY ((ARRAY['Приход'::character varying, 'Расход'::character varying, 'Возврат'::character varying, 'Инвентаризация'::character varying])::"text"[]))),
    CONSTRAINT "mfn_warehouse_quantity_kg_check" CHECK (("quantity_kg" > (0)::numeric))
);


ALTER TABLE "public"."mfn_warehouse" OWNER TO "postgres";


COMMENT ON TABLE "public"."mfn_warehouse" IS 'Склад МФН нити - отдельное хранение от основного сырья';



CREATE TABLE IF NOT EXISTS "public"."product_catalog" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "code" character varying(50) NOT NULL,
    "name" character varying(255) NOT NULL,
    "category" character varying(100),
    "description" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."product_catalog" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_catalog" IS 'Справочник готовой продукции';



CREATE TABLE IF NOT EXISTS "public"."production_cutting" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "doc_number" "text" NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "time" time without time zone DEFAULT CURRENT_TIME NOT NULL,
    "shift" "text",
    "operator" "text" NOT NULL,
    "roll_number" "text" NOT NULL,
    "material_type" "text" NOT NULL,
    "material_code" "text" NOT NULL,
    "total_used_m" numeric(10,2) NOT NULL,
    "cutting_type_category" "text" NOT NULL,
    "cutting_type_code" "text" NOT NULL,
    "cutting_type_name" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "consumption_m" numeric(10,2) NOT NULL,
    "waste_m" numeric(10,2) DEFAULT 0,
    "total_weight_kg" numeric(10,2),
    "status" "text" DEFAULT 'Проведено'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "operator_id" "uuid",
    "is_custom_size" boolean DEFAULT false,
    "roll_id" "uuid",
    CONSTRAINT "production_cutting_material_type_check" CHECK (("material_type" = ANY (ARRAY['Ткань'::"text", 'Ламинат'::"text", 'Стропа'::"text"]))),
    CONSTRAINT "production_cutting_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "production_cutting_shift_check" CHECK (("shift" = ANY (ARRAY['День'::"text", 'Ночь'::"text"]))),
    CONSTRAINT "production_cutting_status_check" CHECK (("status" = ANY (ARRAY['Черновик'::"text", 'В работе'::"text", 'Проведено'::"text", 'Отменено'::"text"])))
);


ALTER TABLE "public"."production_cutting" OWNER TO "postgres";


COMMENT ON TABLE "public"."production_cutting" IS 'Журнал производства кроя - история всех операций раскроя';



COMMENT ON COLUMN "public"."production_cutting"."roll_number" IS 'Номер рулона ткани/ламината или код стропы';



COMMENT ON COLUMN "public"."production_cutting"."total_used_m" IS 'Всего израсходовано материала (расход + отходы)';



COMMENT ON COLUMN "public"."production_cutting"."consumption_m" IS 'Чистый расход на детали';



COMMENT ON COLUMN "public"."production_cutting"."waste_m" IS 'Отходы (обрезки, брак)';



COMMENT ON COLUMN "public"."production_cutting"."operator_id" IS 'ID оператора кроя из таблицы employees (новое поле, заменяет operator TEXT)';



COMMENT ON COLUMN "public"."production_cutting"."is_custom_size" IS 'TRUE = размеры введены вручную (см. custom_cutting_sizes), FALSE = из справочника cutting_types';



COMMENT ON COLUMN "public"."production_cutting"."roll_id" IS 'Ссылка на рулон (weaving_rolls.id). Новое поле для прямой связи с рулоном';



CREATE TABLE IF NOT EXISTS "public"."production_extrusion" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "doc_number" "text",
    "date" "date" DEFAULT CURRENT_DATE,
    "shift" "text",
    "machine_id" "uuid",
    "yarn_type_id" "uuid",
    "operator_extruder_id" "uuid",
    "operator_winder1_id" "uuid",
    "operator_winder2_id" "uuid",
    "dosators_data" "jsonb",
    "output_bobbins" integer DEFAULT 0,
    "output_weight_net" numeric DEFAULT 0,
    "waste_weight" numeric DEFAULT 0,
    "downtime_minutes" integer DEFAULT 0,
    "notes" "text",
    "batch_number" "text",
    "yarn_denier" integer,
    "yarn_code" character varying(50),
    "yarn_name" character varying(255),
    "yarn_width_mm" numeric,
    "yarn_color" "text",
    "operator_winder3_id" "uuid"
);


ALTER TABLE "public"."production_extrusion" OWNER TO "postgres";


COMMENT ON COLUMN "public"."production_extrusion"."yarn_denier" IS 'Денье нити из спецификации';



COMMENT ON COLUMN "public"."production_extrusion"."yarn_code" IS 'Код нити (например: PP-800D)';



COMMENT ON COLUMN "public"."production_extrusion"."yarn_name" IS 'Название нити';



COMMENT ON COLUMN "public"."production_extrusion"."operator_winder3_id" IS 'ID третьего намотчика';



CREATE TABLE IF NOT EXISTS "public"."production_lamination" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "doc_number" "text",
    "date" "date" DEFAULT CURRENT_DATE,
    "shift" "text",
    "machine_id" "uuid",
    "operator_id" "uuid",
    "input_roll_id" "uuid",
    "input_length" numeric,
    "input_weight" numeric,
    "dosators_data" "jsonb",
    "output_roll_id" "uuid",
    "output_length" numeric,
    "output_weight" numeric,
    "waste_weight" numeric DEFAULT 0,
    "notes" "text",
    "waste" numeric(10,2) DEFAULT 0,
    "dosators" "jsonb"
);


ALTER TABLE "public"."production_lamination" OWNER TO "postgres";


COMMENT ON TABLE "public"."production_lamination" IS 'Журнал производства ламинации';



COMMENT ON COLUMN "public"."production_lamination"."waste" IS 'Отходы при ламинации (кг)';



COMMENT ON COLUMN "public"."production_lamination"."dosators" IS 'Использованное сырье - массив дозаторов [{material_id: UUID, weight: number}]';



CREATE TABLE IF NOT EXISTS "public"."production_printing" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doc_number" "text" NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "time" time without time zone DEFAULT CURRENT_TIME NOT NULL,
    "shift" "text",
    "operator" "text",
    "operator_id" "uuid",
    "cutting_type_code" "text" NOT NULL,
    "cutting_type_name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "paint_name" "text" NOT NULL,
    "notes" "text",
    "status" "text" DEFAULT 'Проведено'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "paint_consumption_g" numeric(10,2),
    CONSTRAINT "production_printing_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "production_printing_shift_check" CHECK (("shift" = ANY (ARRAY['День'::"text", 'Ночь'::"text"]))),
    CONSTRAINT "production_printing_status_check" CHECK (("status" = ANY (ARRAY['Черновик'::"text", 'Проведено'::"text", 'Отменено'::"text"])))
);


ALTER TABLE "public"."production_printing" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."production_sewing" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "doc_number" "text" NOT NULL,
    "date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "time" time without time zone DEFAULT CURRENT_TIME NOT NULL,
    "seamstress" "text" NOT NULL,
    "operation_code" "text" NOT NULL,
    "operation_name" "text" NOT NULL,
    "operation_category" "text",
    "quantity_good" integer NOT NULL,
    "quantity_defect" integer DEFAULT 0,
    "time_norm_minutes" numeric(10,2) DEFAULT 0,
    "amount_kzt" numeric(10,2) DEFAULT 0,
    "shift_master" "text",
    "notes" "text",
    "status" "text" DEFAULT 'Проведено'::"text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "production_sewing_quantity_defect_check" CHECK (("quantity_defect" >= 0)),
    CONSTRAINT "production_sewing_quantity_good_check" CHECK (("quantity_good" >= 0))
);


ALTER TABLE "public"."production_sewing" OWNER TO "postgres";


COMMENT ON TABLE "public"."production_sewing" IS 'Журнал производства пошива';



COMMENT ON COLUMN "public"."production_sewing"."seamstress" IS 'ФИО швеи';



COMMENT ON COLUMN "public"."production_sewing"."operation_code" IS 'Код операции из справочника';



COMMENT ON COLUMN "public"."production_sewing"."quantity_good" IS 'Количество годных изделий';



COMMENT ON COLUMN "public"."production_sewing"."quantity_defect" IS 'Количество брака';



COMMENT ON COLUMN "public"."production_sewing"."amount_kzt" IS 'Сумма к оплате в тенге';



CREATE TABLE IF NOT EXISTS "public"."production_straps" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "date" "date" NOT NULL,
    "shift" character varying(20) NOT NULL,
    "machine_id" "uuid",
    "operator_id" "uuid",
    "strap_type_id" "uuid",
    "produced_length" numeric(10,2) NOT NULL,
    "produced_weight" numeric(10,2) NOT NULL,
    "notes" "text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "defect_weight" numeric(10,3) DEFAULT 0,
    "calculated_weight" numeric(10,3),
    "spec_name" character varying(100)
);


ALTER TABLE "public"."production_straps" OWNER TO "postgres";


COMMENT ON COLUMN "public"."production_straps"."defect_weight" IS 'Вес бракованной продукции в кг';



COMMENT ON COLUMN "public"."production_straps"."calculated_weight" IS 'Теоретический вес по спецификации в кг (для сравнения с фактическим)';



COMMENT ON COLUMN "public"."production_straps"."spec_name" IS 'Название спецификации стропы из справочника strop_specifications';



CREATE TABLE IF NOT EXISTS "public"."production_weaving" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "date" "date" DEFAULT CURRENT_DATE,
    "shift" "text",
    "roll_id" "uuid",
    "operator_id" "uuid",
    "produced_length" numeric DEFAULT 0,
    "produced_weight" numeric DEFAULT 0,
    "notes" "text",
    "warp_usage_kg" numeric,
    "weft_usage_kg" numeric
);


ALTER TABLE "public"."production_weaving" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "type" "text" NOT NULL,
    "params" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."products" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."qc_journal" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doc_number" character varying(50) NOT NULL,
    "inspection_date" "date" NOT NULL,
    "inspection_time" time without time zone DEFAULT CURRENT_TIME NOT NULL,
    "inspector_name" character varying(255) NOT NULL,
    "product_code" character varying(50) NOT NULL,
    "product_name" character varying(255) NOT NULL,
    "product_type" character varying(100),
    "quantity_good" integer DEFAULT 0 NOT NULL,
    "quantity_defect" integer DEFAULT 0 NOT NULL,
    "defect_reason" "text",
    "defect_category" character varying(100),
    "decision" character varying(50) DEFAULT 'Принято'::character varying,
    "source_doc_number" character varying(50),
    "notes" "text",
    "status" character varying(20) DEFAULT 'Активно'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "qc_journal_quantity_defect_check" CHECK (("quantity_defect" >= 0)),
    CONSTRAINT "qc_journal_quantity_good_check" CHECK (("quantity_good" >= 0))
);


ALTER TABLE "public"."qc_journal" OWNER TO "postgres";


COMMENT ON TABLE "public"."qc_journal" IS 'Журнал приёмки ОТК - контроль качества готовых изделий';



CREATE TABLE IF NOT EXISTS "public"."raw_materials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "unit" "text" DEFAULT 'kg'::"text",
    "min_stock" numeric DEFAULT 0,
    "type" "text" DEFAULT 'Основное сырье'::"text",
    "supplier" "text",
    "current_price" numeric DEFAULT 0
);


ALTER TABLE "public"."raw_materials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."sewing_operations" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "category" "text" NOT NULL,
    "complexity" integer DEFAULT 1,
    "time_norm_minutes" numeric(10,2) DEFAULT 0,
    "rate_kzt" numeric(10,2) DEFAULT 0,
    "description" "text",
    "status" "text" DEFAULT 'Активно'::"text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sewing_operations_complexity_check" CHECK ((("complexity" >= 1) AND ("complexity" <= 5))),
    CONSTRAINT "sewing_operations_status_check" CHECK (("status" = ANY (ARRAY['Активно'::"text", 'Архив'::"text"])))
);


ALTER TABLE "public"."sewing_operations" OWNER TO "postgres";


COMMENT ON TABLE "public"."sewing_operations" IS 'Справочник операций пошива';



COMMENT ON COLUMN "public"."sewing_operations"."code" IS 'Код операции (например: SEW-001)';



COMMENT ON COLUMN "public"."sewing_operations"."name" IS 'Название операции (например: Пошив тела мешка)';



COMMENT ON COLUMN "public"."sewing_operations"."category" IS 'Категория (Основные, Вспомогательные)';



COMMENT ON COLUMN "public"."sewing_operations"."complexity" IS 'Сложность от 1 до 5';



COMMENT ON COLUMN "public"."sewing_operations"."time_norm_minutes" IS 'Норма времени на 1 изделие в минутах';



COMMENT ON COLUMN "public"."sewing_operations"."rate_kzt" IS 'Расценка за 1 изделие в тенге';



CREATE TABLE IF NOT EXISTS "public"."sewing_specifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "sewing_operation_code" "text" NOT NULL,
    "cutting_part_code" "text" NOT NULL,
    "cutting_part_name" "text" NOT NULL,
    "quantity" integer NOT NULL,
    "status" "text" DEFAULT 'Активно'::"text",
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "sewing_specifications_quantity_check" CHECK (("quantity" > 0)),
    CONSTRAINT "sewing_specifications_status_check" CHECK (("status" = ANY (ARRAY['Активно'::"text", 'Архив'::"text"])))
);


ALTER TABLE "public"."sewing_specifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."sewing_specifications" IS 'Спецификации операций пошива - какие детали нужны';



COMMENT ON COLUMN "public"."sewing_specifications"."sewing_operation_code" IS 'Код операции пошива';



COMMENT ON COLUMN "public"."sewing_specifications"."cutting_part_code" IS 'Код кроеной детали из справочника cutting_types';



COMMENT ON COLUMN "public"."sewing_specifications"."quantity" IS 'Количество деталей на 1 изделие';



CREATE TABLE IF NOT EXISTS "public"."sewn_products_warehouse" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "doc_number" character varying(50) NOT NULL,
    "operation_date" "date" NOT NULL,
    "operation_time" time without time zone DEFAULT CURRENT_TIME NOT NULL,
    "operation_type" character varying(20) NOT NULL,
    "product_code" character varying(50) NOT NULL,
    "product_name" character varying(255) NOT NULL,
    "product_type" character varying(100),
    "quantity" integer NOT NULL,
    "source_doc_number" character varying(50),
    "source_doc_type" character varying(50),
    "employee_name" character varying(255),
    "shift" character varying(20),
    "notes" "text",
    "status" character varying(20) DEFAULT 'Активно'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    CONSTRAINT "sewn_products_warehouse_operation_type_check" CHECK ((("operation_type")::"text" = ANY ((ARRAY['Приход'::character varying, 'Расход'::character varying])::"text"[]))),
    CONSTRAINT "sewn_products_warehouse_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."sewn_products_warehouse" OWNER TO "postgres";


COMMENT ON TABLE "public"."sewn_products_warehouse" IS 'Склад отшитой продукции - буфер между пошивом и ОТК';



CREATE TABLE IF NOT EXISTS "public"."strap_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "code" "text" NOT NULL,
    "name" "text" NOT NULL,
    "width_mm" numeric NOT NULL,
    "color" "text",
    "standard_weight_g_m" numeric,
    "description" "text"
);


ALTER TABLE "public"."strap_types" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."straps_warehouse" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "roll_number" character varying(100),
    "production_id" "uuid",
    "strap_type_id" "uuid",
    "produced_length" numeric(10,2) NOT NULL,
    "produced_weight" numeric(10,2) NOT NULL,
    "length" numeric(10,2),
    "weight" numeric(10,2),
    "status" character varying(50) DEFAULT 'available'::character varying,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"(),
    "spec_name" character varying(100)
);


ALTER TABLE "public"."straps_warehouse" OWNER TO "postgres";


COMMENT ON COLUMN "public"."straps_warehouse"."spec_name" IS 'Название спецификации стропы из справочника strop_specifications';



CREATE TABLE IF NOT EXISTS "public"."strop_specifications" (
    "id" integer NOT NULL,
    "kod_almas" character varying(50),
    "nazvanie" character varying(100) NOT NULL,
    "shirina_mm" integer NOT NULL,
    "plotnost_gr_mp" integer NOT NULL,
    "tip" character varying(50) DEFAULT 'лента-тесьма'::character varying NOT NULL,
    "osnova_nit_type" character varying(10) NOT NULL,
    "osnova_denye" integer,
    "osnova_shirina_niti_sm" numeric(5,2),
    "osnova_kol_nitey" integer,
    "osnova_kol_nitey_shpulyarnik" integer,
    "osnova_ves_9m_gr" numeric(10,4),
    "osnova_itogo_kg" numeric(10,4),
    "utok_denye" integer DEFAULT 900,
    "utok_vid_niti" character varying(10) DEFAULT 'МФН'::character varying,
    "utok_percent_v_1m" numeric(5,2),
    "utok_kol_nitey_shpulyarnik" integer,
    "utok_ves_9m_gr" numeric(10,4),
    "utok_itogo_kg" numeric(10,4),
    "math_plotnost_gr_m2" numeric(10,4),
    "razryv_po_osnove" numeric(10,2),
    "elastichnost_po_osnove" character varying(20),
    "ves_1_pogonnogo_m_gr" numeric(10,2),
    "shirina_v_razvorote_mm" integer,
    "udelny_ves_m" numeric(10,2),
    "percent_othodov" numeric(5,4),
    "perevod_gr_na_kg" numeric(10,4),
    "is_fully_purchased" boolean DEFAULT false,
    "receptura_itogo_kg" numeric(10,4),
    "receptura_pp_kg" numeric(10,4),
    "receptura_karbonat_kg" numeric(10,4),
    "receptura_uf_kg" numeric(10,4),
    "receptura_krasitel_kg" numeric(10,4),
    "mfn_rashod_kg" numeric(10,4),
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."strop_specifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."strop_specifications" IS 'Справочник спецификаций строп для производства биг-бэгов. Основа может быть ПП (своя) или МФН (покупная), уток всегда МФН.';



COMMENT ON COLUMN "public"."strop_specifications"."kod_almas" IS 'Код изделия в системе Алмас';



COMMENT ON COLUMN "public"."strop_specifications"."nazvanie" IS 'Название стропы в формате: ПТ [ширина] мм-[плотность] гр/мп';



COMMENT ON COLUMN "public"."strop_specifications"."shirina_mm" IS 'Ширина стропы в миллиметрах';



COMMENT ON COLUMN "public"."strop_specifications"."plotnost_gr_mp" IS 'Плотность в граммах на метр погонный';



COMMENT ON COLUMN "public"."strop_specifications"."osnova_nit_type" IS 'Тип нити основы: ПП = собственное производство, МФН = покупная нить';



COMMENT ON COLUMN "public"."strop_specifications"."utok_vid_niti" IS 'Тип нити утка - всегда МФН (мультифиламентная нить), покупается';



COMMENT ON COLUMN "public"."strop_specifications"."is_fully_purchased" IS 'TRUE если стропа полностью из покупной МФН нити (основа + уток)';



COMMENT ON COLUMN "public"."strop_specifications"."receptura_pp_kg" IS 'Расход полипропилена на 1м (только если основа из ПП)';



COMMENT ON COLUMN "public"."strop_specifications"."mfn_rashod_kg" IS 'Суммарный расход покупной МФН нити на 1 метр стропы в кг';



CREATE SEQUENCE IF NOT EXISTS "public"."strop_specifications_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."strop_specifications_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."strop_specifications_id_seq" OWNED BY "public"."strop_specifications"."id";



CREATE TABLE IF NOT EXISTS "public"."task_change_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "changed_by" "text" NOT NULL,
    "changed_at" timestamp with time zone DEFAULT "now"(),
    "field_name" "text" NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "comment" "text"
);


ALTER TABLE "public"."task_change_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."task_change_history" IS 'История всех изменений задач для аудита';



CREATE TABLE IF NOT EXISTS "public"."tasks_from_management" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "department" "text" NOT NULL,
    "task_description" "text" NOT NULL,
    "deadline" "date" NOT NULL,
    "responsible_person" "text" NOT NULL,
    "status" "text" DEFAULT 'Новая'::"text",
    "progress_percent" integer DEFAULT 0,
    "response_comment" "text",
    "failure_reason" "text",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "priority" "text" DEFAULT 'Средний'::"text"
);


ALTER TABLE "public"."tasks_from_management" OWNER TO "postgres";


COMMENT ON COLUMN "public"."tasks_from_management"."priority" IS 'Приоритет: Высокий, Средний, Низкий';



CREATE SEQUENCE IF NOT EXISTS "public"."tkan_specifications_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."tkan_specifications_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."tkan_specifications_id_seq" OWNED BY "public"."tkan_specifications"."id";



CREATE TABLE IF NOT EXISTS "public"."user_profiles" (
    "id" "uuid" NOT NULL,
    "employee_id" "uuid",
    "role" character varying(20) DEFAULT 'operator'::character varying NOT NULL,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_profiles" IS 'Профили пользователей системы с привязкой к сотрудникам';



COMMENT ON COLUMN "public"."user_profiles"."employee_id" IS 'Связь с сотрудником (опционально)';



COMMENT ON COLUMN "public"."user_profiles"."role" IS 'Роль: admin, manager, operator, warehouse, qc, accountant';



CREATE OR REPLACE VIEW "public"."user_profiles_with_employee" AS
 SELECT "up"."id",
    "up"."employee_id",
    "up"."role",
    "up"."is_active",
    "up"."created_at",
    "e"."full_name",
    "e"."role" AS "position",
    "au"."email"
   FROM (("public"."user_profiles" "up"
     LEFT JOIN "public"."employees" "e" ON (("up"."employee_id" = "e"."id")))
     LEFT JOIN "auth"."users" "au" ON (("up"."id" = "au"."id")));


ALTER VIEW "public"."user_profiles_with_employee" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_cutting_parts_balance" AS
 SELECT "cutting_type_code" AS "code",
    "max"("cutting_type_name") AS "name",
    "max"("category") AS "category",
    COALESCE("sum"(
        CASE
            WHEN ("operation" = 'Приход'::"text") THEN "quantity"
            ELSE 0
        END), (0)::bigint) AS "total_in",
    COALESCE("sum"(
        CASE
            WHEN ("operation" = 'Расход'::"text") THEN "quantity"
            ELSE 0
        END), (0)::bigint) AS "total_out",
    (COALESCE("sum"(
        CASE
            WHEN ("operation" = 'Приход'::"text") THEN "quantity"
            ELSE 0
        END), (0)::bigint) - COALESCE("sum"(
        CASE
            WHEN ("operation" = 'Расход'::"text") THEN "quantity"
            ELSE 0
        END), (0)::bigint)) AS "balance",
    "max"("created_at") AS "last_movement"
   FROM "public"."cutting_parts_warehouse"
  WHERE ("status" = 'Проведено'::"text")
  GROUP BY "cutting_type_code"
 HAVING ((COALESCE("sum"(
        CASE
            WHEN ("operation" = 'Приход'::"text") THEN "quantity"
            ELSE 0
        END), (0)::bigint) - COALESCE("sum"(
        CASE
            WHEN ("operation" = 'Расход'::"text") THEN "quantity"
            ELSE 0
        END), (0)::bigint)) <> 0)
  ORDER BY "cutting_type_code";


ALTER VIEW "public"."view_cutting_parts_balance" OWNER TO "postgres";


COMMENT ON VIEW "public"."view_cutting_parts_balance" IS 'Остатки кроеных деталей на складе';



CREATE OR REPLACE VIEW "public"."view_finished_goods_balance" AS
 SELECT "product_code" AS "code",
    "max"("product_name") AS "name",
    COALESCE("sum"(
        CASE
            WHEN ("operation" = ANY (ARRAY['Приход'::"text", 'Возврат'::"text"])) THEN "quantity"
            ELSE 0
        END), (0)::bigint) AS "total_in",
    COALESCE("sum"(
        CASE
            WHEN ("operation" = 'Расход'::"text") THEN "quantity"
            ELSE 0
        END), (0)::bigint) AS "total_out",
    (COALESCE("sum"(
        CASE
            WHEN ("operation" = ANY (ARRAY['Приход'::"text", 'Возврат'::"text"])) THEN "quantity"
            ELSE 0
        END), (0)::bigint) - COALESCE("sum"(
        CASE
            WHEN ("operation" = 'Расход'::"text") THEN "quantity"
            ELSE 0
        END), (0)::bigint)) AS "balance",
    "max"("created_at") AS "last_movement"
   FROM "public"."finished_goods_warehouse"
  WHERE ("status" = 'Проведено'::"text")
  GROUP BY "product_code"
 HAVING ((COALESCE("sum"(
        CASE
            WHEN ("operation" = ANY (ARRAY['Приход'::"text", 'Возврат'::"text"])) THEN "quantity"
            ELSE 0
        END), (0)::bigint) - COALESCE("sum"(
        CASE
            WHEN ("operation" = 'Расход'::"text") THEN "quantity"
            ELSE 0
        END), (0)::bigint)) <> 0)
  ORDER BY "product_code";


ALTER VIEW "public"."view_finished_goods_balance" OWNER TO "postgres";


COMMENT ON VIEW "public"."view_finished_goods_balance" IS 'Остатки готовой продукции на складе';



CREATE OR REPLACE VIEW "public"."view_material_balances" AS
SELECT
    NULL::"uuid" AS "id",
    NULL::"text" AS "name",
    NULL::"text" AS "unit",
    NULL::numeric AS "min_stock",
    NULL::"text" AS "type",
    NULL::numeric AS "total_in",
    NULL::numeric AS "total_out",
    NULL::numeric AS "current_balance";


ALTER VIEW "public"."view_material_balances" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."view_mfn_balance" AS
 SELECT "material_code",
    "material_name",
    "denier",
    "color",
    "sum"(
        CASE
            WHEN ((("operation_type")::"text" = 'Приход'::"text") OR (("operation_type")::"text" = 'Возврат'::"text")) THEN "quantity_kg"
            ELSE (0)::numeric
        END) AS "total_in",
    "sum"(
        CASE
            WHEN (("operation_type")::"text" = 'Расход'::"text") THEN "quantity_kg"
            ELSE (0)::numeric
        END) AS "total_out",
    "sum"(
        CASE
            WHEN (("operation_type")::"text" = ANY ((ARRAY['Приход'::character varying, 'Возврат'::character varying])::"text"[])) THEN "quantity_kg"
            WHEN (("operation_type")::"text" = 'Расход'::"text") THEN (- "quantity_kg")
            ELSE (0)::numeric
        END) AS "balance_kg",
    "avg"("price_per_kg") FILTER (WHERE ("price_per_kg" IS NOT NULL)) AS "avg_price_per_kg",
    "max"("operation_date") AS "last_movement_date",
    "count"(*) AS "operation_count",
    "now"() AS "calculated_at"
   FROM "public"."mfn_warehouse"
  WHERE (("status")::"text" = 'Активно'::"text")
  GROUP BY "material_code", "material_name", "denier", "color"
 HAVING ("sum"(
        CASE
            WHEN (("operation_type")::"text" = ANY ((ARRAY['Приход'::character varying, 'Возврат'::character varying])::"text"[])) THEN "quantity_kg"
            WHEN (("operation_type")::"text" = 'Расход'::"text") THEN (- "quantity_kg")
            ELSE (0)::numeric
        END) > (0)::numeric)
  ORDER BY "material_name", "denier";


ALTER VIEW "public"."view_mfn_balance" OWNER TO "postgres";


COMMENT ON VIEW "public"."view_mfn_balance" IS 'Остатки МФН нити на складе';



CREATE OR REPLACE VIEW "public"."view_mfn_statistics" AS
 SELECT "material_code",
    "material_name",
    "denier",
    "color",
    "sum"(
        CASE
            WHEN (("operation_type")::"text" = 'Приход'::"text") THEN "quantity_kg"
            ELSE (0)::numeric
        END) AS "total_received",
    "sum"(
        CASE
            WHEN (("operation_type")::"text" = 'Расход'::"text") THEN "quantity_kg"
            ELSE (0)::numeric
        END) AS "total_consumed",
    "sum"(
        CASE
            WHEN (("operation_type")::"text" = 'Возврат'::"text") THEN "quantity_kg"
            ELSE (0)::numeric
        END) AS "total_returned",
    "sum"(
        CASE
            WHEN (("operation_type")::"text" = 'Приход'::"text") THEN "total_amount"
            ELSE (0)::numeric
        END) AS "total_purchase_amount",
    "avg"("price_per_kg") FILTER (WHERE (("operation_type")::"text" = 'Приход'::"text")) AS "avg_purchase_price",
    "min"("operation_date") AS "first_operation",
    "max"("operation_date") AS "last_operation",
    "count"(*) AS "total_operations"
   FROM "public"."mfn_warehouse"
  WHERE (("status")::"text" = 'Активно'::"text")
  GROUP BY "material_code", "material_name", "denier", "color"
  ORDER BY ("sum"(
        CASE
            WHEN (("operation_type")::"text" = 'Приход'::"text") THEN "quantity_kg"
            ELSE (0)::numeric
        END)) DESC;


ALTER VIEW "public"."view_mfn_statistics" OWNER TO "postgres";


COMMENT ON VIEW "public"."view_mfn_statistics" IS 'Статистика по МФН нити';



CREATE OR REPLACE VIEW "public"."view_qc_statistics" AS
 SELECT "product_code",
    "product_name",
    "product_type",
    "sum"(("quantity_good" + "quantity_defect")) AS "total_inspected",
    "sum"("quantity_good") AS "total_good",
    "sum"("quantity_defect") AS "total_defect",
    "round"(
        CASE
            WHEN ("sum"(("quantity_good" + "quantity_defect")) > 0) THEN ((("sum"("quantity_defect"))::numeric / ("sum"(("quantity_good" + "quantity_defect")))::numeric) * (100)::numeric)
            ELSE (0)::numeric
        END, 2) AS "defect_percentage",
    "count"(*) AS "inspection_count",
    "min"("inspection_date") AS "first_inspection",
    "max"("inspection_date") AS "last_inspection"
   FROM "public"."qc_journal"
  WHERE (("status")::"text" = 'Активно'::"text")
  GROUP BY "product_code", "product_name", "product_type"
  ORDER BY ("sum"(("quantity_good" + "quantity_defect"))) DESC;


ALTER VIEW "public"."view_qc_statistics" OWNER TO "postgres";


COMMENT ON VIEW "public"."view_qc_statistics" IS 'Статистика ОТК по изделиям';



CREATE OR REPLACE VIEW "public"."view_sewn_products_balance" AS
 SELECT "product_code",
    "product_name",
    "product_type",
    "sum"(
        CASE
            WHEN (("operation_type")::"text" = 'Приход'::"text") THEN "quantity"
            ELSE 0
        END) AS "total_received",
    "sum"(
        CASE
            WHEN (("operation_type")::"text" = 'Расход'::"text") THEN "quantity"
            ELSE 0
        END) AS "total_issued",
    "sum"(
        CASE
            WHEN (("operation_type")::"text" = 'Приход'::"text") THEN "quantity"
            ELSE (- "quantity")
        END) AS "balance",
    "max"("operation_date") AS "last_movement_date",
    "now"() AS "calculated_at"
   FROM "public"."sewn_products_warehouse"
  WHERE (("status")::"text" = 'Активно'::"text")
  GROUP BY "product_code", "product_name", "product_type"
 HAVING ("sum"(
        CASE
            WHEN (("operation_type")::"text" = 'Приход'::"text") THEN "quantity"
            ELSE (- "quantity")
        END) > 0)
  ORDER BY "product_name";


ALTER VIEW "public"."view_sewn_products_balance" OWNER TO "postgres";


COMMENT ON VIEW "public"."view_sewn_products_balance" IS 'Остатки на складе отшитой продукции';



CREATE OR REPLACE VIEW "public"."view_straps_defect_stats" AS
 SELECT "strap_type_id",
    "date_trunc"('month'::"text", ("date")::timestamp with time zone) AS "month",
    "count"(*) AS "production_count",
    "sum"("produced_length") AS "total_length",
    "sum"("produced_weight") AS "total_weight",
    "sum"("calculated_weight") AS "total_calc_weight",
    "sum"("defect_weight") AS "total_defect",
    "avg"("defect_weight") AS "avg_defect",
        CASE
            WHEN ("sum"("produced_weight") > (0)::numeric) THEN "round"((("sum"("defect_weight") / "sum"("produced_weight")) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS "defect_percentage",
        CASE
            WHEN ("sum"("calculated_weight") > (0)::numeric) THEN "round"(((("sum"("produced_weight") - "sum"("calculated_weight")) / "sum"("calculated_weight")) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS "weight_deviation_percentage"
   FROM "public"."production_straps"
  WHERE ("date" >= (CURRENT_DATE - '1 year'::interval))
  GROUP BY "strap_type_id", ("date_trunc"('month'::"text", ("date")::timestamp with time zone))
  ORDER BY ("date_trunc"('month'::"text", ("date")::timestamp with time zone)) DESC, "strap_type_id";


ALTER VIEW "public"."view_straps_defect_stats" OWNER TO "postgres";


COMMENT ON VIEW "public"."view_straps_defect_stats" IS 'Статистика брака и отклонений веса в производстве строп';



CREATE OR REPLACE VIEW "public"."view_straps_production" AS
 SELECT "ps"."id",
    "ps"."date",
    "ps"."shift",
    "ps"."machine_id",
    "ps"."operator_id",
    "ps"."strap_type_id",
    "ps"."produced_length",
    "ps"."produced_weight",
    "ps"."notes",
    "ps"."created_at",
    "ps"."updated_at",
    "ps"."defect_weight",
    "ps"."calculated_weight",
    "ps"."spec_name",
    "e"."name" AS "equipment_name",
    "emp"."full_name" AS "operator_name",
    "ss"."nazvanie" AS "specification_name",
    "ss"."shirina_mm",
    "ss"."plotnost_gr_mp",
    "ss"."osnova_nit_type",
    "ss"."utok_denye"
   FROM ((("public"."production_straps" "ps"
     LEFT JOIN "public"."equipment" "e" ON (("ps"."machine_id" = "e"."id")))
     LEFT JOIN "public"."employees" "emp" ON (("ps"."operator_id" = "emp"."id")))
     LEFT JOIN "public"."strop_specifications" "ss" ON ((("ps"."spec_name")::"text" = ("ss"."nazvanie")::"text")))
  ORDER BY "ps"."date" DESC, "ps"."created_at" DESC;


ALTER VIEW "public"."view_straps_production" OWNER TO "postgres";


COMMENT ON VIEW "public"."view_straps_production" IS 'Производство строп с детальной информацией';



CREATE TABLE IF NOT EXISTS "public"."waste_materials" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "workshop" "text" NOT NULL,
    "material_type" "text" NOT NULL,
    "material_description" "text",
    "quantity" numeric(10,2) NOT NULL,
    "unit" "text" NOT NULL,
    "reason" "text",
    "notes" "text",
    "recorded_by" "uuid",
    CONSTRAINT "waste_materials_quantity_check" CHECK (("quantity" > (0)::numeric)),
    CONSTRAINT "waste_materials_unit_check" CHECK (("unit" = ANY (ARRAY['kg'::"text", 'meters'::"text", 'pieces'::"text", 'rolls'::"text"]))),
    CONSTRAINT "waste_materials_workshop_check" CHECK (("workshop" = ANY (ARRAY['extrusion'::"text", 'weaving'::"text", 'lamination'::"text", 'cutting'::"text"])))
);


ALTER TABLE "public"."waste_materials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weaving_setup_cards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "title" "text" NOT NULL,
    "width_cm" numeric NOT NULL,
    "density_g_m2" numeric NOT NULL,
    "warp_spec" "text",
    "weft_spec" "text",
    "total_threads_target" integer,
    "linear_weight_g_m" numeric,
    "weave_type" "text",
    "sectors_pattern" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL
);


ALTER TABLE "public"."weaving_setup_cards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."yarn_inventory" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "yarn_type_id" "uuid",
    "batch_number" "text" NOT NULL,
    "quantity_kg" numeric DEFAULT 0,
    "bobbin_count" integer DEFAULT 0,
    "location" "text" DEFAULT 'Склад 1'::"text",
    "last_updated" timestamp with time zone DEFAULT "now"(),
    "yarn_denier" integer,
    "yarn_code" character varying(50),
    "yarn_name" character varying(255),
    "name" "text",
    "quantity" numeric DEFAULT 0,
    "color" "text",
    "denier" integer,
    "width_mm" numeric
);


ALTER TABLE "public"."yarn_inventory" OWNER TO "postgres";


COMMENT ON COLUMN "public"."yarn_inventory"."yarn_denier" IS 'Денье нити из спецификации';



COMMENT ON COLUMN "public"."yarn_inventory"."yarn_code" IS 'Код нити (например: PP-800D)';



COMMENT ON COLUMN "public"."yarn_inventory"."yarn_name" IS 'Название нити';



CREATE TABLE IF NOT EXISTS "public"."yarn_types" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "sku" "text",
    "denier" integer NOT NULL,
    "color" "text",
    "standard_weight" numeric,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."yarn_types" OWNER TO "postgres";


ALTER TABLE ONLY "public"."strop_specifications" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."strop_specifications_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."tkan_specifications" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."tkan_specifications_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_batch_number_key" UNIQUE ("batch_number");



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."custom_cutting_sizes"
    ADD CONSTRAINT "custom_cutting_sizes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_orders"
    ADD CONSTRAINT "customer_orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."customer_orders"
    ADD CONSTRAINT "customer_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cutting_parts_warehouse"
    ADD CONSTRAINT "cutting_parts_warehouse_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cutting_types"
    ADD CONSTRAINT "cutting_types_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."cutting_types"
    ADD CONSTRAINT "cutting_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."defect_materials"
    ADD CONSTRAINT "defect_materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employee_attendance"
    ADD CONSTRAINT "employee_attendance_employee_id_date_key" UNIQUE ("employee_id", "date");



ALTER TABLE ONLY "public"."employee_attendance"
    ADD CONSTRAINT "employee_attendance_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."equipment"
    ADD CONSTRAINT "equipment_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_inventory"
    ADD CONSTRAINT "fabric_inventory_doc_number_key" UNIQUE ("doc_number");



ALTER TABLE ONLY "public"."fabric_inventory"
    ADD CONSTRAINT "fabric_inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."fabric_types"
    ADD CONSTRAINT "fabric_types_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."fabric_types"
    ADD CONSTRAINT "fabric_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."finished_goods_warehouse"
    ADD CONSTRAINT "finished_goods_warehouse_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_transactions"
    ADD CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lab_tests"
    ADD CONSTRAINT "lab_tests_doc_number_key" UNIQUE ("doc_number");



ALTER TABLE ONLY "public"."lab_tests"
    ADD CONSTRAINT "lab_tests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."laminated_rolls"
    ADD CONSTRAINT "laminated_rolls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."laminated_rolls"
    ADD CONSTRAINT "laminated_rolls_roll_number_key" UNIQUE ("roll_number");



ALTER TABLE ONLY "public"."mfn_warehouse"
    ADD CONSTRAINT "mfn_warehouse_doc_number_key" UNIQUE ("doc_number");



ALTER TABLE ONLY "public"."mfn_warehouse"
    ADD CONSTRAINT "mfn_warehouse_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_catalog"
    ADD CONSTRAINT "product_catalog_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."product_catalog"
    ADD CONSTRAINT "product_catalog_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."production_cutting"
    ADD CONSTRAINT "production_cutting_doc_number_key" UNIQUE ("doc_number");



ALTER TABLE ONLY "public"."production_cutting"
    ADD CONSTRAINT "production_cutting_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."production_extrusion"
    ADD CONSTRAINT "production_extrusion_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."production_lamination"
    ADD CONSTRAINT "production_lamination_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."production_printing"
    ADD CONSTRAINT "production_printing_doc_number_key" UNIQUE ("doc_number");



ALTER TABLE ONLY "public"."production_printing"
    ADD CONSTRAINT "production_printing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."production_sewing"
    ADD CONSTRAINT "production_sewing_doc_number_key" UNIQUE ("doc_number");



ALTER TABLE ONLY "public"."production_sewing"
    ADD CONSTRAINT "production_sewing_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."production_straps"
    ADD CONSTRAINT "production_straps_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."production_weaving"
    ADD CONSTRAINT "production_weaving_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."qc_journal"
    ADD CONSTRAINT "qc_journal_doc_number_key" UNIQUE ("doc_number");



ALTER TABLE ONLY "public"."qc_journal"
    ADD CONSTRAINT "qc_journal_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."raw_materials"
    ADD CONSTRAINT "raw_materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sewing_operations"
    ADD CONSTRAINT "sewing_operations_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."sewing_operations"
    ADD CONSTRAINT "sewing_operations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sewing_specifications"
    ADD CONSTRAINT "sewing_specifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sewing_specifications"
    ADD CONSTRAINT "sewing_specifications_sewing_operation_code_cutting_part_co_key" UNIQUE ("sewing_operation_code", "cutting_part_code");



ALTER TABLE ONLY "public"."sewn_products_warehouse"
    ADD CONSTRAINT "sewn_products_warehouse_doc_number_key" UNIQUE ("doc_number");



ALTER TABLE ONLY "public"."sewn_products_warehouse"
    ADD CONSTRAINT "sewn_products_warehouse_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."strap_types"
    ADD CONSTRAINT "strap_types_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."strap_types"
    ADD CONSTRAINT "strap_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."straps_warehouse"
    ADD CONSTRAINT "straps_warehouse_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."straps_warehouse"
    ADD CONSTRAINT "straps_warehouse_roll_number_key" UNIQUE ("roll_number");



ALTER TABLE ONLY "public"."strop_specifications"
    ADD CONSTRAINT "strop_specifications_nazvanie_key" UNIQUE ("nazvanie");



ALTER TABLE ONLY "public"."strop_specifications"
    ADD CONSTRAINT "strop_specifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_change_history"
    ADD CONSTRAINT "task_change_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tasks_from_management"
    ADD CONSTRAINT "tasks_from_management_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tkan_specifications"
    ADD CONSTRAINT "tkan_specifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."waste_materials"
    ADD CONSTRAINT "waste_materials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weaving_rolls"
    ADD CONSTRAINT "weaving_rolls_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weaving_rolls"
    ADD CONSTRAINT "weaving_rolls_roll_number_key" UNIQUE ("roll_number");



ALTER TABLE ONLY "public"."weaving_setup_cards"
    ADD CONSTRAINT "weaving_setup_cards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."yarn_inventory"
    ADD CONSTRAINT "yarn_inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."yarn_inventory"
    ADD CONSTRAINT "yarn_inventory_yarn_type_id_batch_number_key" UNIQUE ("yarn_type_id", "batch_number");



ALTER TABLE ONLY "public"."yarn_types"
    ADD CONSTRAINT "yarn_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."yarn_types"
    ADD CONSTRAINT "yarn_types_sku_key" UNIQUE ("sku");



CREATE INDEX "idx_custom_cutting_production" ON "public"."custom_cutting_sizes" USING "btree" ("production_cutting_id");



CREATE INDEX "idx_cutting_parts_code" ON "public"."cutting_parts_warehouse" USING "btree" ("cutting_type_code");



CREATE INDEX "idx_cutting_parts_date" ON "public"."cutting_parts_warehouse" USING "btree" ("date" DESC);



CREATE INDEX "idx_cutting_parts_operation" ON "public"."cutting_parts_warehouse" USING "btree" ("operation");



CREATE INDEX "idx_cutting_types_material_type" ON "public"."cutting_types" USING "btree" ("material_type");



CREATE INDEX "idx_cutting_types_status" ON "public"."cutting_types" USING "btree" ("status");



CREATE INDEX "idx_defect_materials_created_at" ON "public"."defect_materials" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_defect_materials_defect_type" ON "public"."defect_materials" USING "btree" ("defect_type");



CREATE INDEX "idx_defect_materials_material_type" ON "public"."defect_materials" USING "btree" ("material_type");



CREATE INDEX "idx_defect_materials_workshop" ON "public"."defect_materials" USING "btree" ("workshop");



CREATE INDEX "idx_employees_birth_date" ON "public"."employees" USING "btree" ("birth_date");



CREATE INDEX "idx_employees_department" ON "public"."employees" USING "btree" ("department");



CREATE INDEX "idx_extrusion_denier" ON "public"."production_extrusion" USING "btree" ("yarn_denier");



CREATE INDEX "idx_fabric_inv_date" ON "public"."fabric_inventory" USING "btree" ("date");



CREATE INDEX "idx_fabric_inv_roll" ON "public"."fabric_inventory" USING "btree" ("roll_number");



CREATE INDEX "idx_fabric_inv_spec" ON "public"."fabric_inventory" USING "btree" ("fabric_spec_id");



CREATE INDEX "idx_fabric_inv_type" ON "public"."fabric_inventory" USING "btree" ("operation_type");



CREATE INDEX "idx_finished_goods_warehouse_code" ON "public"."finished_goods_warehouse" USING "btree" ("product_code");



CREATE INDEX "idx_finished_goods_warehouse_date" ON "public"."finished_goods_warehouse" USING "btree" ("date");



CREATE INDEX "idx_finished_goods_warehouse_operation" ON "public"."finished_goods_warehouse" USING "btree" ("operation");



CREATE INDEX "idx_lab_tests_created_at" ON "public"."lab_tests" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_lab_tests_doc_number" ON "public"."lab_tests" USING "btree" ("doc_number");



CREATE INDEX "idx_lab_tests_test_type" ON "public"."lab_tests" USING "btree" ("test_type");



CREATE INDEX "idx_laminated_rolls_location" ON "public"."laminated_rolls" USING "btree" ("location");



CREATE INDEX "idx_laminated_rolls_location_status" ON "public"."laminated_rolls" USING "btree" ("location", "status");



CREATE INDEX "idx_laminated_rolls_production" ON "public"."laminated_rolls" USING "btree" ("production_id");



CREATE INDEX "idx_laminated_rolls_status" ON "public"."laminated_rolls" USING "btree" ("status");



CREATE INDEX "idx_mfn_warehouse_date" ON "public"."mfn_warehouse" USING "btree" ("operation_date" DESC);



CREATE INDEX "idx_mfn_warehouse_denier" ON "public"."mfn_warehouse" USING "btree" ("denier");



CREATE INDEX "idx_mfn_warehouse_doc" ON "public"."mfn_warehouse" USING "btree" ("doc_number");



CREATE INDEX "idx_mfn_warehouse_material" ON "public"."mfn_warehouse" USING "btree" ("material_code");



CREATE INDEX "idx_mfn_warehouse_operation" ON "public"."mfn_warehouse" USING "btree" ("operation_type");



CREATE INDEX "idx_product_catalog_active" ON "public"."product_catalog" USING "btree" ("is_active");



CREATE INDEX "idx_product_catalog_category" ON "public"."product_catalog" USING "btree" ("category");



CREATE INDEX "idx_product_catalog_code" ON "public"."product_catalog" USING "btree" ("code");



CREATE INDEX "idx_production_cutting_cutting_type" ON "public"."production_cutting" USING "btree" ("cutting_type_code");



CREATE INDEX "idx_production_cutting_date" ON "public"."production_cutting" USING "btree" ("date" DESC);



CREATE INDEX "idx_production_cutting_material_type" ON "public"."production_cutting" USING "btree" ("material_type");



CREATE INDEX "idx_production_cutting_operator" ON "public"."production_cutting" USING "btree" ("operator");



CREATE INDEX "idx_production_cutting_roll" ON "public"."production_cutting" USING "btree" ("roll_number");



CREATE INDEX "idx_production_extrusion_winder3" ON "public"."production_extrusion" USING "btree" ("operator_winder3_id");



CREATE INDEX "idx_production_lamination_date" ON "public"."production_lamination" USING "btree" ("date");



CREATE INDEX "idx_production_lamination_machine" ON "public"."production_lamination" USING "btree" ("machine_id");



CREATE INDEX "idx_production_printing_cutting_type" ON "public"."production_printing" USING "btree" ("cutting_type_code");



CREATE INDEX "idx_production_printing_date" ON "public"."production_printing" USING "btree" ("date" DESC);



CREATE INDEX "idx_production_printing_doc_number" ON "public"."production_printing" USING "btree" ("doc_number");



CREATE INDEX "idx_production_printing_paint" ON "public"."production_printing" USING "btree" ("paint_name");



CREATE INDEX "idx_production_sewing_date" ON "public"."production_sewing" USING "btree" ("date");



CREATE INDEX "idx_production_sewing_operation" ON "public"."production_sewing" USING "btree" ("operation_code");



CREATE INDEX "idx_production_sewing_seamstress" ON "public"."production_sewing" USING "btree" ("seamstress");



CREATE INDEX "idx_production_straps_date" ON "public"."production_straps" USING "btree" ("date");



CREATE INDEX "idx_production_straps_defect" ON "public"."production_straps" USING "btree" ("defect_weight") WHERE ("defect_weight" > (0)::numeric);



CREATE INDEX "idx_production_straps_strap_type" ON "public"."production_straps" USING "btree" ("strap_type_id");



CREATE INDEX "idx_qc_journal_date" ON "public"."qc_journal" USING "btree" ("inspection_date" DESC);



CREATE INDEX "idx_qc_journal_decision" ON "public"."qc_journal" USING "btree" ("decision");



CREATE INDEX "idx_qc_journal_inspector" ON "public"."qc_journal" USING "btree" ("inspector_name");



CREATE INDEX "idx_qc_journal_product" ON "public"."qc_journal" USING "btree" ("product_code");



CREATE INDEX "idx_sewing_operations_code" ON "public"."sewing_operations" USING "btree" ("code");



CREATE INDEX "idx_sewing_operations_status" ON "public"."sewing_operations" USING "btree" ("status");



CREATE INDEX "idx_sewing_specifications_operation" ON "public"."sewing_specifications" USING "btree" ("sewing_operation_code");



CREATE INDEX "idx_sewing_specifications_part" ON "public"."sewing_specifications" USING "btree" ("cutting_part_code");



CREATE INDEX "idx_sewn_products_warehouse_date" ON "public"."sewn_products_warehouse" USING "btree" ("operation_date" DESC);



CREATE INDEX "idx_sewn_products_warehouse_doc" ON "public"."sewn_products_warehouse" USING "btree" ("doc_number");



CREATE INDEX "idx_sewn_products_warehouse_operation" ON "public"."sewn_products_warehouse" USING "btree" ("operation_type");



CREATE INDEX "idx_sewn_products_warehouse_product" ON "public"."sewn_products_warehouse" USING "btree" ("product_code");



CREATE INDEX "idx_straps_warehouse_status" ON "public"."straps_warehouse" USING "btree" ("status");



CREATE INDEX "idx_straps_warehouse_strap_type" ON "public"."straps_warehouse" USING "btree" ("strap_type_id");



CREATE INDEX "idx_strop_is_purchased" ON "public"."strop_specifications" USING "btree" ("is_fully_purchased");



CREATE INDEX "idx_strop_nazvanie" ON "public"."strop_specifications" USING "btree" ("nazvanie");



CREATE INDEX "idx_strop_osnova_type" ON "public"."strop_specifications" USING "btree" ("osnova_nit_type");



CREATE INDEX "idx_strop_shirina" ON "public"."strop_specifications" USING "btree" ("shirina_mm");



CREATE INDEX "idx_task_history_changed_at" ON "public"."task_change_history" USING "btree" ("changed_at" DESC);



CREATE INDEX "idx_task_history_task_id" ON "public"."task_change_history" USING "btree" ("task_id");



CREATE INDEX "idx_tasks_deadline" ON "public"."tasks_from_management" USING "btree" ("deadline");



CREATE INDEX "idx_tasks_department" ON "public"."tasks_from_management" USING "btree" ("department");



CREATE INDEX "idx_tasks_status" ON "public"."tasks_from_management" USING "btree" ("status");



CREATE INDEX "idx_tkan_color_name" ON "public"."tkan_specifications" USING "btree" ("color_name");



CREATE INDEX "idx_tkan_is_colored" ON "public"."tkan_specifications" USING "btree" ("is_colored");



CREATE INDEX "idx_tkan_nazvanie" ON "public"."tkan_specifications" USING "btree" ("nazvanie_tkani");



CREATE INDEX "idx_tkan_shirina_plotnost" ON "public"."tkan_specifications" USING "btree" ("shirina_polotna_sm", "plotnost_polotna_gr_m2");



CREATE INDEX "idx_tkan_tip" ON "public"."tkan_specifications" USING "btree" ("tip");



CREATE INDEX "idx_user_profiles_employee" ON "public"."user_profiles" USING "btree" ("employee_id");



CREATE INDEX "idx_user_profiles_role" ON "public"."user_profiles" USING "btree" ("role");



CREATE INDEX "idx_waste_materials_created_at" ON "public"."waste_materials" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_waste_materials_material_type" ON "public"."waste_materials" USING "btree" ("material_type");



CREATE INDEX "idx_waste_materials_workshop" ON "public"."waste_materials" USING "btree" ("workshop");



CREATE INDEX "idx_weaving_rolls_location" ON "public"."weaving_rolls" USING "btree" ("location");



CREATE INDEX "idx_weaving_rolls_location_status" ON "public"."weaving_rolls" USING "btree" ("location", "status");



CREATE INDEX "idx_yarn_inv_code" ON "public"."yarn_inventory" USING "btree" ("yarn_code");



CREATE INDEX "idx_yarn_inv_denier" ON "public"."yarn_inventory" USING "btree" ("yarn_denier");



CREATE OR REPLACE VIEW "public"."view_material_balances" AS
 SELECT "m"."id",
    "m"."name",
    "m"."unit",
    "m"."min_stock",
    "m"."type",
    COALESCE("sum"(
        CASE
            WHEN ("t"."type" = 'in'::"text") THEN "t"."quantity"
            ELSE (0)::numeric
        END), (0)::numeric) AS "total_in",
    COALESCE("sum"(
        CASE
            WHEN ("t"."type" = 'out'::"text") THEN "t"."quantity"
            ELSE (0)::numeric
        END), (0)::numeric) AS "total_out",
    COALESCE("sum"(
        CASE
            WHEN ("t"."type" = 'in'::"text") THEN "t"."quantity"
            ELSE (- "t"."quantity")
        END), (0)::numeric) AS "current_balance"
   FROM ("public"."raw_materials" "m"
     LEFT JOIN "public"."inventory_transactions" "t" ON (("m"."id" = "t"."material_id")))
  GROUP BY "m"."id";



CREATE OR REPLACE TRIGGER "trigger_auto_create_strap_warehouse" AFTER INSERT ON "public"."production_straps" FOR EACH ROW EXECUTE FUNCTION "public"."auto_create_strap_warehouse_entry"();



CREATE OR REPLACE TRIGGER "trigger_printing_updated_at" BEFORE UPDATE ON "public"."production_printing" FOR EACH ROW EXECUTE FUNCTION "public"."update_printing_updated_at"();



CREATE OR REPLACE TRIGGER "update_cutting_parts_warehouse_updated_at" BEFORE UPDATE ON "public"."cutting_parts_warehouse" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_cutting_types_updated_at" BEFORE UPDATE ON "public"."cutting_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_fabric_types_updated_at" BEFORE UPDATE ON "public"."fabric_types" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_finished_goods_warehouse_updated_at" BEFORE UPDATE ON "public"."finished_goods_warehouse" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_mfn_warehouse_updated_at" BEFORE UPDATE ON "public"."mfn_warehouse" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_product_catalog_updated_at" BEFORE UPDATE ON "public"."product_catalog" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_production_cutting_updated_at" BEFORE UPDATE ON "public"."production_cutting" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_production_sewing_updated_at" BEFORE UPDATE ON "public"."production_sewing" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_qc_journal_updated_at" BEFORE UPDATE ON "public"."qc_journal" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sewing_operations_updated_at" BEFORE UPDATE ON "public"."sewing_operations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sewing_specifications_updated_at" BEFORE UPDATE ON "public"."sewing_specifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_sewn_products_warehouse_updated_at" BEFORE UPDATE ON "public"."sewn_products_warehouse" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."batches"
    ADD CONSTRAINT "batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."custom_cutting_sizes"
    ADD CONSTRAINT "custom_cutting_sizes_production_cutting_id_fkey" FOREIGN KEY ("production_cutting_id") REFERENCES "public"."production_cutting"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."defect_materials"
    ADD CONSTRAINT "defect_materials_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."employee_attendance"
    ADD CONSTRAINT "employee_attendance_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."fabric_inventory"
    ADD CONSTRAINT "fabric_inventory_fabric_type_id_fkey" FOREIGN KEY ("fabric_type_id") REFERENCES "public"."fabric_types"("id");



ALTER TABLE ONLY "public"."inventory_transactions"
    ADD CONSTRAINT "inventory_transactions_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "public"."raw_materials"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_transactions"
    ADD CONSTRAINT "inventory_transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."lab_tests"
    ADD CONSTRAINT "lab_tests_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."laminated_rolls"
    ADD CONSTRAINT "laminated_rolls_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "public"."production_lamination"("id");



ALTER TABLE ONLY "public"."laminated_rolls"
    ADD CONSTRAINT "laminated_rolls_source_roll_id_fkey" FOREIGN KEY ("source_roll_id") REFERENCES "public"."weaving_rolls"("id");



ALTER TABLE ONLY "public"."production_cutting"
    ADD CONSTRAINT "production_cutting_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."production_cutting"
    ADD CONSTRAINT "production_cutting_roll_id_fkey" FOREIGN KEY ("roll_id") REFERENCES "public"."weaving_rolls"("id");



ALTER TABLE ONLY "public"."production_extrusion"
    ADD CONSTRAINT "production_extrusion_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "public"."equipment"("id");



ALTER TABLE ONLY "public"."production_extrusion"
    ADD CONSTRAINT "production_extrusion_operator_extruder_id_fkey" FOREIGN KEY ("operator_extruder_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."production_extrusion"
    ADD CONSTRAINT "production_extrusion_operator_winder1_id_fkey" FOREIGN KEY ("operator_winder1_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."production_extrusion"
    ADD CONSTRAINT "production_extrusion_operator_winder2_id_fkey" FOREIGN KEY ("operator_winder2_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."production_extrusion"
    ADD CONSTRAINT "production_extrusion_operator_winder3_id_fkey" FOREIGN KEY ("operator_winder3_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."production_extrusion"
    ADD CONSTRAINT "production_extrusion_yarn_type_id_fkey" FOREIGN KEY ("yarn_type_id") REFERENCES "public"."yarn_types"("id");



ALTER TABLE ONLY "public"."production_lamination"
    ADD CONSTRAINT "production_lamination_input_roll_id_fkey" FOREIGN KEY ("input_roll_id") REFERENCES "public"."weaving_rolls"("id");



ALTER TABLE ONLY "public"."production_lamination"
    ADD CONSTRAINT "production_lamination_machine_id_fkey" FOREIGN KEY ("machine_id") REFERENCES "public"."equipment"("id");



ALTER TABLE ONLY "public"."production_lamination"
    ADD CONSTRAINT "production_lamination_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."production_lamination"
    ADD CONSTRAINT "production_lamination_output_roll_id_fkey" FOREIGN KEY ("output_roll_id") REFERENCES "public"."weaving_rolls"("id");



ALTER TABLE ONLY "public"."production_printing"
    ADD CONSTRAINT "production_printing_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."production_straps"
    ADD CONSTRAINT "production_straps_strap_type_id_fkey" FOREIGN KEY ("strap_type_id") REFERENCES "public"."strap_types"("id");



ALTER TABLE ONLY "public"."production_weaving"
    ADD CONSTRAINT "production_weaving_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."employees"("id");



ALTER TABLE ONLY "public"."production_weaving"
    ADD CONSTRAINT "production_weaving_roll_id_fkey" FOREIGN KEY ("roll_id") REFERENCES "public"."weaving_rolls"("id");



ALTER TABLE ONLY "public"."sewing_specifications"
    ADD CONSTRAINT "sewing_specifications_sewing_operation_code_fkey" FOREIGN KEY ("sewing_operation_code") REFERENCES "public"."sewing_operations"("code") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."straps_warehouse"
    ADD CONSTRAINT "straps_warehouse_production_id_fkey" FOREIGN KEY ("production_id") REFERENCES "public"."production_straps"("id");



ALTER TABLE ONLY "public"."straps_warehouse"
    ADD CONSTRAINT "straps_warehouse_strap_type_id_fkey" FOREIGN KEY ("strap_type_id") REFERENCES "public"."strap_types"("id");



ALTER TABLE ONLY "public"."task_change_history"
    ADD CONSTRAINT "task_change_history_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."tasks_from_management"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_profiles"
    ADD CONSTRAINT "user_profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."waste_materials"
    ADD CONSTRAINT "waste_materials_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."weaving_rolls"
    ADD CONSTRAINT "weaving_rolls_fabric_spec_id_fkey" FOREIGN KEY ("fabric_spec_id") REFERENCES "public"."tkan_specifications"("id");



ALTER TABLE ONLY "public"."weaving_rolls"
    ADD CONSTRAINT "weaving_rolls_loom_id_fkey" FOREIGN KEY ("loom_id") REFERENCES "public"."equipment"("id");



ALTER TABLE ONLY "public"."weaving_rolls"
    ADD CONSTRAINT "weaving_rolls_warp_batch_id_fkey" FOREIGN KEY ("warp_batch_id") REFERENCES "public"."yarn_inventory"("id");



ALTER TABLE ONLY "public"."weaving_rolls"
    ADD CONSTRAINT "weaving_rolls_weft_batch_id_fkey" FOREIGN KEY ("weft_batch_id") REFERENCES "public"."yarn_inventory"("id");



ALTER TABLE ONLY "public"."yarn_inventory"
    ADD CONSTRAINT "yarn_inventory_yarn_type_id_fkey" FOREIGN KEY ("yarn_type_id") REFERENCES "public"."yarn_types"("id");



CREATE POLICY "Admins can delete profiles" ON "public"."user_profiles" FOR DELETE USING ((("public"."get_my_role"())::"text" = 'admin'::"text"));



CREATE POLICY "Admins can insert profiles" ON "public"."user_profiles" FOR INSERT WITH CHECK ((("public"."get_my_role"())::"text" = 'admin'::"text"));



CREATE POLICY "Admins can update profiles" ON "public"."user_profiles" FOR UPDATE USING ((("public"."get_my_role"())::"text" = 'admin'::"text"));



CREATE POLICY "Admins can view all profiles" ON "public"."user_profiles" FOR SELECT USING ((("public"."get_my_role"())::"text" = 'admin'::"text"));



CREATE POLICY "Allow all access" ON "public"."employee_attendance" USING (true);



CREATE POLICY "Allow all access to cutting_parts_warehouse" ON "public"."cutting_parts_warehouse" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to finished_goods_warehouse" ON "public"."finished_goods_warehouse" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to mfn_warehouse" ON "public"."mfn_warehouse" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to product_catalog" ON "public"."product_catalog" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to production_sewing" ON "public"."production_sewing" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to qc_journal" ON "public"."qc_journal" USING (true) WITH CHECK (true);



CREATE POLICY "Allow all access to sewn_products_warehouse" ON "public"."sewn_products_warehouse" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all for authenticated users" ON "public"."finished_goods_warehouse" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all for authenticated users" ON "public"."production_sewing" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all for authenticated users" ON "public"."sewing_operations" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable all for authenticated users" ON "public"."sewing_specifications" TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Enable delete access for admins only" ON "public"."tasks_from_management" FOR DELETE USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "public"."defect_materials" FOR DELETE USING (true);



CREATE POLICY "Enable delete for authenticated users" ON "public"."waste_materials" FOR DELETE USING (true);



CREATE POLICY "Enable insert access for all users" ON "public"."task_change_history" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert access for all users" ON "public"."tasks_from_management" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."defect_materials" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable insert for authenticated users" ON "public"."waste_materials" FOR INSERT WITH CHECK (true);



CREATE POLICY "Enable read access for all users" ON "public"."defect_materials" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."task_change_history" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."tasks_from_management" FOR SELECT USING (true);



CREATE POLICY "Enable read access for all users" ON "public"."waste_materials" FOR SELECT USING (true);



CREATE POLICY "Enable update access for all users" ON "public"."tasks_from_management" FOR UPDATE USING (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."defect_materials" FOR UPDATE USING (true);



CREATE POLICY "Enable update for authenticated users" ON "public"."waste_materials" FOR UPDATE USING (true);



CREATE POLICY "Users can view own profile" ON "public"."user_profiles" FOR SELECT USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."cutting_parts_warehouse" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."defect_materials" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."employee_attendance" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."finished_goods_warehouse" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lab_tests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lab_tests_delete" ON "public"."lab_tests" FOR DELETE USING (true);



CREATE POLICY "lab_tests_insert" ON "public"."lab_tests" FOR INSERT WITH CHECK (true);



CREATE POLICY "lab_tests_select" ON "public"."lab_tests" FOR SELECT USING (true);



CREATE POLICY "lab_tests_update" ON "public"."lab_tests" FOR UPDATE USING (true);



ALTER TABLE "public"."mfn_warehouse" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."product_catalog" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."production_printing" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "production_printing_delete" ON "public"."production_printing" FOR DELETE USING (true);



CREATE POLICY "production_printing_insert" ON "public"."production_printing" FOR INSERT WITH CHECK (true);



CREATE POLICY "production_printing_select" ON "public"."production_printing" FOR SELECT USING (true);



CREATE POLICY "production_printing_update" ON "public"."production_printing" FOR UPDATE USING (true);



ALTER TABLE "public"."production_sewing" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."qc_journal" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sewn_products_warehouse" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."task_change_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."tasks_from_management" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."waste_materials" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."add_fabric_to_inventory"("p_roll_number" character varying, "p_fabric_type_id" "uuid", "p_length" numeric, "p_weight" numeric, "p_linked_doc" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."add_fabric_to_inventory"("p_roll_number" character varying, "p_fabric_type_id" "uuid", "p_length" numeric, "p_weight" numeric, "p_linked_doc" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_fabric_to_inventory"("p_roll_number" character varying, "p_fabric_type_id" "uuid", "p_length" numeric, "p_weight" numeric, "p_linked_doc" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_yarn_to_inventory"("p_yarn_type_id" "uuid", "p_batch_number" "text", "p_bobbins" integer, "p_weight" numeric) TO "anon";
GRANT ALL ON FUNCTION "public"."add_yarn_to_inventory"("p_yarn_type_id" "uuid", "p_batch_number" "text", "p_bobbins" integer, "p_weight" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_yarn_to_inventory"("p_yarn_type_id" "uuid", "p_batch_number" "text", "p_bobbins" integer, "p_weight" numeric) TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_create_strap_warehouse_entry"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_create_strap_warehouse_entry"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_create_strap_warehouse_entry"() TO "service_role";



GRANT ALL ON FUNCTION "public"."consume_yarn_for_weaving"("p_yarn_code" character varying, "p_batch" character varying, "p_quantity" numeric, "p_linked_doc" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."consume_yarn_for_weaving"("p_yarn_code" character varying, "p_batch" character varying, "p_quantity" numeric, "p_linked_doc" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."consume_yarn_for_weaving"("p_yarn_code" character varying, "p_batch" character varying, "p_quantity" numeric, "p_linked_doc" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_lab_doc_number"("p_prefix" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."generate_lab_doc_number"("p_prefix" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_lab_doc_number"("p_prefix" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_defect_statistics"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_defect_statistics"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_defect_statistics"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_my_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_my_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_waste_statistics"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."get_waste_statistics"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_waste_statistics"("p_start_date" timestamp with time zone, "p_end_date" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("required_role" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("required_role" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("required_role" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."move_laminated_roll_to_cutting"("p_roll_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."move_laminated_roll_to_cutting"("p_roll_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."move_laminated_roll_to_cutting"("p_roll_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."move_roll_to_cutting"("p_roll_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."move_roll_to_cutting"("p_roll_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."move_roll_to_cutting"("p_roll_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."process_lamination"("p_date" "date", "p_shift" character varying, "p_machine_id" "uuid", "p_operator_id" "uuid", "p_input_roll_id" "uuid", "p_input_length" numeric, "p_input_weight" numeric, "p_output_length" numeric, "p_output_weight" numeric, "p_waste" numeric, "p_dosators" "jsonb", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."process_lamination"("p_date" "date", "p_shift" character varying, "p_machine_id" "uuid", "p_operator_id" "uuid", "p_input_roll_id" "uuid", "p_input_length" numeric, "p_input_weight" numeric, "p_output_length" numeric, "p_output_weight" numeric, "p_waste" numeric, "p_dosators" "jsonb", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."process_lamination"("p_date" "date", "p_shift" character varying, "p_machine_id" "uuid", "p_operator_id" "uuid", "p_input_roll_id" "uuid", "p_input_length" numeric, "p_input_weight" numeric, "p_output_length" numeric, "p_output_weight" numeric, "p_waste" numeric, "p_dosators" "jsonb", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."register_extrusion_output"("p_date" "date", "p_shift" "text", "p_machine_id" "uuid", "p_operator_id" "uuid", "p_yarn_name" "text", "p_yarn_denier" integer, "p_width_mm" numeric, "p_color" "text", "p_batch_number" "text", "p_weight_kg" numeric, "p_operator_winder1" "uuid", "p_operator_winder2" "uuid", "p_operator_winder3" "uuid", "p_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."register_extrusion_output"("p_date" "date", "p_shift" "text", "p_machine_id" "uuid", "p_operator_id" "uuid", "p_yarn_name" "text", "p_yarn_denier" integer, "p_width_mm" numeric, "p_color" "text", "p_batch_number" "text", "p_weight_kg" numeric, "p_operator_winder1" "uuid", "p_operator_winder2" "uuid", "p_operator_winder3" "uuid", "p_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_extrusion_output"("p_date" "date", "p_shift" "text", "p_machine_id" "uuid", "p_operator_id" "uuid", "p_yarn_name" "text", "p_yarn_denier" integer, "p_width_mm" numeric, "p_color" "text", "p_batch_number" "text", "p_weight_kg" numeric, "p_operator_winder1" "uuid", "p_operator_winder2" "uuid", "p_operator_winder3" "uuid", "p_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."register_weaving_log"("p_date" "date", "p_shift" "text", "p_roll_id" "uuid", "p_operator_id" "uuid", "p_length" numeric, "p_weight" numeric, "p_notes" "text", "p_is_finished" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."register_weaving_log"("p_date" "date", "p_shift" "text", "p_roll_id" "uuid", "p_operator_id" "uuid", "p_length" numeric, "p_weight" numeric, "p_notes" "text", "p_is_finished" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."register_weaving_log"("p_date" "date", "p_shift" "text", "p_roll_id" "uuid", "p_operator_id" "uuid", "p_length" numeric, "p_weight" numeric, "p_notes" "text", "p_is_finished" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."return_laminated_roll_to_lamination"("p_roll_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."return_laminated_roll_to_lamination"("p_roll_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."return_laminated_roll_to_lamination"("p_roll_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."return_roll_to_weaving"("p_roll_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."return_roll_to_weaving"("p_roll_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."return_roll_to_weaving"("p_roll_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_admin_by_email"("user_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_admin_by_email"("user_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_admin_by_email"("user_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_printing_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_printing_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_printing_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON TABLE "public"."batches" TO "anon";
GRANT ALL ON TABLE "public"."batches" TO "authenticated";
GRANT ALL ON TABLE "public"."batches" TO "service_role";



GRANT ALL ON TABLE "public"."custom_cutting_sizes" TO "anon";
GRANT ALL ON TABLE "public"."custom_cutting_sizes" TO "authenticated";
GRANT ALL ON TABLE "public"."custom_cutting_sizes" TO "service_role";



GRANT ALL ON TABLE "public"."customer_orders" TO "anon";
GRANT ALL ON TABLE "public"."customer_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_orders" TO "service_role";



GRANT ALL ON TABLE "public"."cutting_parts_warehouse" TO "anon";
GRANT ALL ON TABLE "public"."cutting_parts_warehouse" TO "authenticated";
GRANT ALL ON TABLE "public"."cutting_parts_warehouse" TO "service_role";



GRANT ALL ON TABLE "public"."cutting_parts_balance" TO "anon";
GRANT ALL ON TABLE "public"."cutting_parts_balance" TO "authenticated";
GRANT ALL ON TABLE "public"."cutting_parts_balance" TO "service_role";



GRANT ALL ON TABLE "public"."tkan_specifications" TO "anon";
GRANT ALL ON TABLE "public"."tkan_specifications" TO "authenticated";
GRANT ALL ON TABLE "public"."tkan_specifications" TO "service_role";



GRANT ALL ON TABLE "public"."weaving_rolls" TO "anon";
GRANT ALL ON TABLE "public"."weaving_rolls" TO "authenticated";
GRANT ALL ON TABLE "public"."weaving_rolls" TO "service_role";



GRANT ALL ON TABLE "public"."cutting_rolls_available" TO "anon";
GRANT ALL ON TABLE "public"."cutting_rolls_available" TO "authenticated";
GRANT ALL ON TABLE "public"."cutting_rolls_available" TO "service_role";



GRANT ALL ON TABLE "public"."cutting_types" TO "anon";
GRANT ALL ON TABLE "public"."cutting_types" TO "authenticated";
GRANT ALL ON TABLE "public"."cutting_types" TO "service_role";



GRANT ALL ON TABLE "public"."defect_materials" TO "anon";
GRANT ALL ON TABLE "public"."defect_materials" TO "authenticated";
GRANT ALL ON TABLE "public"."defect_materials" TO "service_role";



GRANT ALL ON SEQUENCE "public"."doc_sequence" TO "anon";
GRANT ALL ON SEQUENCE "public"."doc_sequence" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."doc_sequence" TO "service_role";



GRANT ALL ON TABLE "public"."employee_attendance" TO "anon";
GRANT ALL ON TABLE "public"."employee_attendance" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_attendance" TO "service_role";



GRANT ALL ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";
GRANT ALL ON TABLE "public"."employees" TO "service_role";



GRANT ALL ON TABLE "public"."equipment" TO "anon";
GRANT ALL ON TABLE "public"."equipment" TO "authenticated";
GRANT ALL ON TABLE "public"."equipment" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_inventory" TO "anon";
GRANT ALL ON TABLE "public"."fabric_inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_inventory" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_stock_balance" TO "anon";
GRANT ALL ON TABLE "public"."fabric_stock_balance" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_stock_balance" TO "service_role";



GRANT ALL ON TABLE "public"."fabric_types" TO "anon";
GRANT ALL ON TABLE "public"."fabric_types" TO "authenticated";
GRANT ALL ON TABLE "public"."fabric_types" TO "service_role";



GRANT ALL ON TABLE "public"."finished_goods_warehouse" TO "anon";
GRANT ALL ON TABLE "public"."finished_goods_warehouse" TO "authenticated";
GRANT ALL ON TABLE "public"."finished_goods_warehouse" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_transactions" TO "anon";
GRANT ALL ON TABLE "public"."inventory_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_transactions" TO "service_role";



GRANT ALL ON TABLE "public"."lab_tests" TO "anon";
GRANT ALL ON TABLE "public"."lab_tests" TO "authenticated";
GRANT ALL ON TABLE "public"."lab_tests" TO "service_role";



GRANT ALL ON TABLE "public"."laminated_rolls" TO "anon";
GRANT ALL ON TABLE "public"."laminated_rolls" TO "authenticated";
GRANT ALL ON TABLE "public"."laminated_rolls" TO "service_role";



GRANT ALL ON TABLE "public"."mfn_warehouse" TO "anon";
GRANT ALL ON TABLE "public"."mfn_warehouse" TO "authenticated";
GRANT ALL ON TABLE "public"."mfn_warehouse" TO "service_role";



GRANT ALL ON TABLE "public"."product_catalog" TO "anon";
GRANT ALL ON TABLE "public"."product_catalog" TO "authenticated";
GRANT ALL ON TABLE "public"."product_catalog" TO "service_role";



GRANT ALL ON TABLE "public"."production_cutting" TO "anon";
GRANT ALL ON TABLE "public"."production_cutting" TO "authenticated";
GRANT ALL ON TABLE "public"."production_cutting" TO "service_role";



GRANT ALL ON TABLE "public"."production_extrusion" TO "anon";
GRANT ALL ON TABLE "public"."production_extrusion" TO "authenticated";
GRANT ALL ON TABLE "public"."production_extrusion" TO "service_role";



GRANT ALL ON TABLE "public"."production_lamination" TO "anon";
GRANT ALL ON TABLE "public"."production_lamination" TO "authenticated";
GRANT ALL ON TABLE "public"."production_lamination" TO "service_role";



GRANT ALL ON TABLE "public"."production_printing" TO "anon";
GRANT ALL ON TABLE "public"."production_printing" TO "authenticated";
GRANT ALL ON TABLE "public"."production_printing" TO "service_role";



GRANT ALL ON TABLE "public"."production_sewing" TO "anon";
GRANT ALL ON TABLE "public"."production_sewing" TO "authenticated";
GRANT ALL ON TABLE "public"."production_sewing" TO "service_role";



GRANT ALL ON TABLE "public"."production_straps" TO "anon";
GRANT ALL ON TABLE "public"."production_straps" TO "authenticated";
GRANT ALL ON TABLE "public"."production_straps" TO "service_role";



GRANT ALL ON TABLE "public"."production_weaving" TO "anon";
GRANT ALL ON TABLE "public"."production_weaving" TO "authenticated";
GRANT ALL ON TABLE "public"."production_weaving" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."qc_journal" TO "anon";
GRANT ALL ON TABLE "public"."qc_journal" TO "authenticated";
GRANT ALL ON TABLE "public"."qc_journal" TO "service_role";



GRANT ALL ON TABLE "public"."raw_materials" TO "anon";
GRANT ALL ON TABLE "public"."raw_materials" TO "authenticated";
GRANT ALL ON TABLE "public"."raw_materials" TO "service_role";



GRANT ALL ON TABLE "public"."sewing_operations" TO "anon";
GRANT ALL ON TABLE "public"."sewing_operations" TO "authenticated";
GRANT ALL ON TABLE "public"."sewing_operations" TO "service_role";



GRANT ALL ON TABLE "public"."sewing_specifications" TO "anon";
GRANT ALL ON TABLE "public"."sewing_specifications" TO "authenticated";
GRANT ALL ON TABLE "public"."sewing_specifications" TO "service_role";



GRANT ALL ON TABLE "public"."sewn_products_warehouse" TO "anon";
GRANT ALL ON TABLE "public"."sewn_products_warehouse" TO "authenticated";
GRANT ALL ON TABLE "public"."sewn_products_warehouse" TO "service_role";



GRANT ALL ON TABLE "public"."strap_types" TO "anon";
GRANT ALL ON TABLE "public"."strap_types" TO "authenticated";
GRANT ALL ON TABLE "public"."strap_types" TO "service_role";



GRANT ALL ON TABLE "public"."straps_warehouse" TO "anon";
GRANT ALL ON TABLE "public"."straps_warehouse" TO "authenticated";
GRANT ALL ON TABLE "public"."straps_warehouse" TO "service_role";



GRANT ALL ON TABLE "public"."strop_specifications" TO "anon";
GRANT ALL ON TABLE "public"."strop_specifications" TO "authenticated";
GRANT ALL ON TABLE "public"."strop_specifications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."strop_specifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."strop_specifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."strop_specifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."task_change_history" TO "anon";
GRANT ALL ON TABLE "public"."task_change_history" TO "authenticated";
GRANT ALL ON TABLE "public"."task_change_history" TO "service_role";



GRANT ALL ON TABLE "public"."tasks_from_management" TO "anon";
GRANT ALL ON TABLE "public"."tasks_from_management" TO "authenticated";
GRANT ALL ON TABLE "public"."tasks_from_management" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tkan_specifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tkan_specifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tkan_specifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles" TO "service_role";



GRANT ALL ON TABLE "public"."user_profiles_with_employee" TO "anon";
GRANT ALL ON TABLE "public"."user_profiles_with_employee" TO "authenticated";
GRANT ALL ON TABLE "public"."user_profiles_with_employee" TO "service_role";



GRANT ALL ON TABLE "public"."view_cutting_parts_balance" TO "anon";
GRANT ALL ON TABLE "public"."view_cutting_parts_balance" TO "authenticated";
GRANT ALL ON TABLE "public"."view_cutting_parts_balance" TO "service_role";



GRANT ALL ON TABLE "public"."view_finished_goods_balance" TO "anon";
GRANT ALL ON TABLE "public"."view_finished_goods_balance" TO "authenticated";
GRANT ALL ON TABLE "public"."view_finished_goods_balance" TO "service_role";



GRANT ALL ON TABLE "public"."view_material_balances" TO "anon";
GRANT ALL ON TABLE "public"."view_material_balances" TO "authenticated";
GRANT ALL ON TABLE "public"."view_material_balances" TO "service_role";



GRANT ALL ON TABLE "public"."view_mfn_balance" TO "anon";
GRANT ALL ON TABLE "public"."view_mfn_balance" TO "authenticated";
GRANT ALL ON TABLE "public"."view_mfn_balance" TO "service_role";



GRANT ALL ON TABLE "public"."view_mfn_statistics" TO "anon";
GRANT ALL ON TABLE "public"."view_mfn_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."view_mfn_statistics" TO "service_role";



GRANT ALL ON TABLE "public"."view_qc_statistics" TO "anon";
GRANT ALL ON TABLE "public"."view_qc_statistics" TO "authenticated";
GRANT ALL ON TABLE "public"."view_qc_statistics" TO "service_role";



GRANT ALL ON TABLE "public"."view_sewn_products_balance" TO "anon";
GRANT ALL ON TABLE "public"."view_sewn_products_balance" TO "authenticated";
GRANT ALL ON TABLE "public"."view_sewn_products_balance" TO "service_role";



GRANT ALL ON TABLE "public"."view_straps_defect_stats" TO "anon";
GRANT ALL ON TABLE "public"."view_straps_defect_stats" TO "authenticated";
GRANT ALL ON TABLE "public"."view_straps_defect_stats" TO "service_role";



GRANT ALL ON TABLE "public"."view_straps_production" TO "anon";
GRANT ALL ON TABLE "public"."view_straps_production" TO "authenticated";
GRANT ALL ON TABLE "public"."view_straps_production" TO "service_role";



GRANT ALL ON TABLE "public"."waste_materials" TO "anon";
GRANT ALL ON TABLE "public"."waste_materials" TO "authenticated";
GRANT ALL ON TABLE "public"."waste_materials" TO "service_role";



GRANT ALL ON TABLE "public"."weaving_setup_cards" TO "anon";
GRANT ALL ON TABLE "public"."weaving_setup_cards" TO "authenticated";
GRANT ALL ON TABLE "public"."weaving_setup_cards" TO "service_role";



GRANT ALL ON TABLE "public"."yarn_inventory" TO "anon";
GRANT ALL ON TABLE "public"."yarn_inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."yarn_inventory" TO "service_role";



GRANT ALL ON TABLE "public"."yarn_types" TO "anon";
GRANT ALL ON TABLE "public"."yarn_types" TO "authenticated";
GRANT ALL ON TABLE "public"."yarn_types" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







