-- ============================================
-- ДИАГНОСТИКА РАСХОЖДЕНИЙ В СКЛАДЕ НИТИ
-- ============================================
-- Проверяет соответствие между yarn_inventory.quantity_kg
-- и расчетными балансами из записей производства

-- ============================================
-- 1. ОБЩАЯ СВОДКА ПО КАЖДОЙ ПАРТИИ
-- ============================================
WITH
-- Приход из экструзии
income AS (
  SELECT
    batch_number,
    SUM(output_weight_net) as total_in,
    COUNT(*) as extrusion_count
  FROM production_extrusion
  GROUP BY batch_number
),

-- Расход в ткачестве (ОСНОВА)
warp_consumption AS (
  SELECT
    yi.batch_number,
    yi.id as batch_id,
    COUNT(wr.id) as rolls_count,
    SUM(wr.total_length * COALESCE(ts.osnova_itogo_kg, 0)) as consumed_kg
  FROM yarn_inventory yi
  LEFT JOIN weaving_rolls wr ON wr.warp_batch_id = yi.id
  LEFT JOIN tkan_specifications ts ON wr.fabric_spec_id = ts.id
  WHERE wr.status IN ('completed', 'used')  -- Завершенные и использованные
  GROUP BY yi.batch_number, yi.id
),

-- Расход в ткачестве (УТОК)
weft_consumption AS (
  SELECT
    yi.batch_number,
    yi.id as batch_id,
    COUNT(wr.id) as rolls_count,
    SUM(wr.total_length * COALESCE(ts.utok_itogo_kg, 0)) as consumed_kg
  FROM yarn_inventory yi
  LEFT JOIN weaving_rolls wr ON wr.weft_batch_id = yi.id
  LEFT JOIN tkan_specifications ts ON wr.fabric_spec_id = ts.id
  WHERE wr.status IN ('completed', 'used')
  GROUP BY yi.batch_number, yi.id
)

SELECT
  yi.batch_number as "Партия",
  yi.yarn_name as "Нить",
  ROUND(yi.quantity_kg::numeric, 2) as "Баланс_Склад",
  ROUND(COALESCE(i.total_in, 0)::numeric, 2) as "Приход",
  ROUND(COALESCE(warp.consumed_kg, 0)::numeric, 2) as "Расход_Основа",
  ROUND(COALESCE(weft.consumed_kg, 0)::numeric, 2) as "Расход_Уток",
  ROUND((COALESCE(warp.consumed_kg, 0) + COALESCE(weft.consumed_kg, 0))::numeric, 2) as "Расход_Всего",
  ROUND((COALESCE(i.total_in, 0) - COALESCE(warp.consumed_kg, 0) - COALESCE(weft.consumed_kg, 0))::numeric, 2) as "Баланс_Расчет",
  ROUND((yi.quantity_kg - (COALESCE(i.total_in, 0) - COALESCE(warp.consumed_kg, 0) - COALESCE(weft.consumed_kg, 0)))::numeric, 2) as "РАСХОЖДЕНИЕ",
  COALESCE(warp.rolls_count, 0) + COALESCE(weft.rolls_count, 0) as "Рулонов_Использовано",
  i.extrusion_count as "Партий_Экструзии"
FROM yarn_inventory yi
LEFT JOIN income i ON yi.batch_number = i.batch_number
LEFT JOIN warp_consumption warp ON yi.batch_number = warp.batch_number
LEFT JOIN weft_consumption weft ON yi.batch_number = weft.batch_number
ORDER BY ABS(yi.quantity_kg - (COALESCE(i.total_in, 0) - COALESCE(warp.consumed_kg, 0) - COALESCE(weft.consumed_kg, 0))) DESC;


-- ============================================
-- 2. ПРОВЕРКА РУЛОНОВ БЕЗ ПАРТИЙ НИТИ
-- ============================================
-- Рулоны, у которых НЕ указаны партии нити
-- (старые данные до исправления)

SELECT
  wr.roll_number as "Номер_Рулона",
  wr.status as "Статус",
  wr.total_length as "Длина_м",
  ts.nazvanie_tkani as "Ткань",
  COALESCE(ts.osnova_itogo_kg, 0) as "Расход_Основа_кг_м",
  COALESCE(ts.utok_itogo_kg, 0) as "Расход_Уток_кг_м",
  ROUND((wr.total_length * COALESCE(ts.osnova_itogo_kg, 0))::numeric, 2) as "Не_Списано_Основа_кг",
  ROUND((wr.total_length * COALESCE(ts.utok_itogo_kg, 0))::numeric, 2) as "Не_Списано_Уток_кг",
  wr.created_at as "Создан"
FROM weaving_rolls wr
LEFT JOIN tkan_specifications ts ON wr.fabric_spec_id = ts.id
WHERE wr.status IN ('completed', 'used')
  AND (wr.warp_batch_id IS NULL OR wr.weft_batch_id IS NULL)
ORDER BY wr.created_at DESC;


-- ============================================
-- 3. ИТОГОВАЯ СТАТИСТИКА
-- ============================================

SELECT
  'Общий баланс на складе' as "Показатель",
  ROUND(SUM(quantity_kg)::numeric, 2) as "Значение_кг"
FROM yarn_inventory

UNION ALL

SELECT
  'Общий приход из экструзии' as "Показатель",
  ROUND(SUM(output_weight_net)::numeric, 2) as "Значение_кг"
FROM production_extrusion

UNION ALL

SELECT
  'Расход в ткачестве (расчет)' as "Показатель",
  ROUND(SUM(
    wr.total_length * (
      COALESCE(ts.osnova_itogo_kg, 0) +
      COALESCE(ts.utok_itogo_kg, 0)
    )
  )::numeric, 2) as "Значение_кг"
FROM weaving_rolls wr
LEFT JOIN tkan_specifications ts ON wr.fabric_spec_id = ts.id
WHERE wr.status IN ('completed', 'used')

UNION ALL

SELECT
  'Расчетный баланс (Приход - Расход)' as "Показатель",
  ROUND(
    (
      (SELECT SUM(output_weight_net) FROM production_extrusion) -
      (SELECT SUM(wr.total_length * (COALESCE(ts.osnova_itogo_kg, 0) + COALESCE(ts.utok_itogo_kg, 0)))
       FROM weaving_rolls wr
       LEFT JOIN tkan_specifications ts ON wr.fabric_spec_id = ts.id
       WHERE wr.status IN ('completed', 'used'))
    )::numeric, 2
  ) as "Значение_кг"

UNION ALL

SELECT
  'РАСХОЖДЕНИЕ (Склад - Расчет)' as "Показатель",
  ROUND(
    (
      (SELECT SUM(quantity_kg) FROM yarn_inventory) -
      (
        (SELECT SUM(output_weight_net) FROM production_extrusion) -
        (SELECT SUM(wr.total_length * (COALESCE(ts.osnova_itogo_kg, 0) + COALESCE(ts.utok_itogo_kg, 0)))
         FROM weaving_rolls wr
         LEFT JOIN tkan_specifications ts ON wr.fabric_spec_id = ts.id
         WHERE wr.status IN ('completed', 'used'))
      )
    )::numeric, 2
  ) as "Значение_кг";


-- ============================================
-- КАК ИСПОЛЬЗОВАТЬ:
-- ============================================
-- 1. Откройте Supabase SQL Editor
-- 2. Скопируйте и запустите весь файл
-- 3. Изучите 3 таблицы результатов:
--    - Таблица 1: Детальная сводка по каждой партии
--    - Таблица 2: Рулоны без указания партий нити (проблемные)
--    - Таблица 3: Общая статистика с расхождением
--
-- ИНТЕРПРЕТАЦИЯ:
-- - Если РАСХОЖДЕНИЕ = 0 → все в порядке
-- - Если РАСХОЖДЕНИЕ > 0 → на складе БОЛЬШЕ нити, чем должно быть (расход не списывался)
-- - Если РАСХОЖДЕНИЕ < 0 → на складе МЕНЬШЕ нити (списалось больше, чем было)
--
-- ПРИЧИНЫ РАСХОЖДЕНИЙ:
-- 1. Старые рулоны (до исправления) не списывали нить при завершении
-- 2. Рулоны без партий нити (warp_batch_id = NULL)
-- 3. Ручные корректировки баланса
-- 4. Удаленные записи производства
