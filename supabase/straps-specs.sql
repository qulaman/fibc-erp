-- =====================================================
-- FIBC Kazakhstan: Спецификации строп (Supabase)
-- =====================================================
-- Особенности производства строп:
-- 1. Основа может быть из ПП нити (собственное производство) или МФН (покупная)
-- 2. Уток ВСЕГДА из МФН нити (покупная)
-- 3. Если основа = МФН, то стропа полностью покупная (is_fully_purchased = TRUE)
-- 4. Рецептура указывается только для ПП-части (собственное производство)
-- =====================================================

DROP TABLE IF EXISTS strop_specifications CASCADE;

CREATE TABLE strop_specifications (
    id SERIAL PRIMARY KEY,
    
    -- ========== ИДЕНТИФИКАЦИЯ ==========
    kod_almas VARCHAR(50),                        -- Код в системе Алмас
    nazvanie VARCHAR(100) NOT NULL UNIQUE,        -- Название стропы (ПТ 50 мм-35 гр/мп)
    
    -- ========== ХАРАКТЕРИСТИКИ СТРОПЫ ==========
    shirina_mm INTEGER NOT NULL,                  -- Ширина стропы, мм
    plotnost_gr_mp INTEGER NOT NULL,              -- Плотность, грамм на метр погонный
    tip VARCHAR(50) NOT NULL DEFAULT 'лента-тесьма', -- Тип изделия
    
    -- ========== ХАРАКТЕРИСТИКИ ОСНОВЫ ==========
    -- Основа может быть из ПП (собственное производство) или МФН (покупная)
    osnova_nit_type VARCHAR(10) NOT NULL,         -- Тип нити: 'ПП' или 'МФН'
    osnova_denye INTEGER,                         -- Денье нити основы
    osnova_shirina_niti_sm DECIMAL(5,2),          -- Ширина нити основы, см
    osnova_kol_nitey INTEGER,                     -- Количество нитей в основе
    osnova_kol_nitey_shpulyarnik INTEGER,         -- Количество нитей на шпулярнике
    osnova_ves_9m_gr DECIMAL(10,4),               -- Вес 9 метров нити, грамм
    osnova_itogo_kg DECIMAL(10,4),                -- Расход нити основы на 1м стропы, кг
    
    -- ========== ХАРАКТЕРИСТИКИ УТКА ==========
    -- Уток ВСЕГДА из МФН нити (покупная)
    utok_denye INTEGER DEFAULT 900,               -- Денье нити утка (обычно 900)
    utok_vid_niti VARCHAR(10) DEFAULT 'МФН',      -- Вид нити утка (всегда МФН - покупная)
    utok_percent_v_1m DECIMAL(5,2),               -- Процент содержания утка в 1 метре
    utok_kol_nitey_shpulyarnik INTEGER,           -- Количество нитей на шпулярнике
    utok_ves_9m_gr DECIMAL(10,4),                 -- Вес 9 метров нити, грамм
    utok_itogo_kg DECIMAL(10,4),                  -- Расход нити утка на 1м стропы, кг
    
    -- ========== РАСЧЁТНЫЕ ХАРАКТЕРИСТИКИ ==========
    math_plotnost_gr_m2 DECIMAL(10,4),            -- Математическая плотность, гр/м²
    razryv_po_osnove DECIMAL(10,2),               -- Разрывная нагрузка по основе, кг
    elastichnost_po_osnove VARCHAR(20),           -- Эластичность (удлинение), %
    
    -- ========== ВЕСОВЫЕ ХАРАКТЕРИСТИКИ ==========
    ves_1_pogonnogo_m_gr DECIMAL(10,2),           -- Вес 1 погонного метра стропы, грамм
    shirina_v_razvorote_mm INTEGER,               -- Ширина в развороте, мм
    udelny_ves_m DECIMAL(10,2),                   -- Удельный вес
    percent_othodov DECIMAL(5,4),                 -- Процент закладываемых отходов
    perevod_gr_na_kg DECIMAL(10,4),               -- Коэффициент перевода гр → кг
    
    -- ========== РЕЦЕПТУРА (только для ПП-части!) ==========
    -- Если стропа полностью из МФН (is_fully_purchased=TRUE), рецептура = NULL
    is_fully_purchased BOOLEAN DEFAULT FALSE,     -- TRUE = 100% покупная (МФН основа + МФН уток)
    receptura_itogo_kg DECIMAL(10,4),             -- Итого расход ПП-сырья на 1м, кг
    receptura_pp_kg DECIMAL(10,4),                -- Полипропилен, кг на 1м
    receptura_karbonat_kg DECIMAL(10,4),          -- Карбонат кальция, кг на 1м
    receptura_uf_kg DECIMAL(10,4),                -- УФ стабилизатор, кг на 1м
    receptura_krasitel_kg DECIMAL(10,4),          -- Краситель, кг на 1м
    
    -- ========== РАСХОД ПОКУПНЫХ МАТЕРИАЛОВ ==========
    mfn_rashod_kg DECIMAL(10,4),                  -- Расход покупной МФН нити на 1м, кг
                                                  -- (уток + основа если основа тоже МФН)
    
    -- ========== СЛУЖЕБНЫЕ ПОЛЯ ==========
    is_active BOOLEAN DEFAULT TRUE,               -- Активна ли запись
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ========== ИНДЕКСЫ ==========
CREATE INDEX idx_strop_nazvanie ON strop_specifications(nazvanie);
CREATE INDEX idx_strop_shirina ON strop_specifications(shirina_mm);
CREATE INDEX idx_strop_osnova_type ON strop_specifications(osnova_nit_type);
CREATE INDEX idx_strop_is_purchased ON strop_specifications(is_fully_purchased);

-- ========== КОММЕНТАРИИ К ТАБЛИЦЕ ==========
COMMENT ON TABLE strop_specifications IS 'Справочник спецификаций строп для производства биг-бэгов. Основа может быть ПП (своя) или МФН (покупная), уток всегда МФН.';

COMMENT ON COLUMN strop_specifications.kod_almas IS 'Код изделия в системе Алмас';
COMMENT ON COLUMN strop_specifications.nazvanie IS 'Название стропы в формате: ПТ [ширина] мм-[плотность] гр/мп';
COMMENT ON COLUMN strop_specifications.shirina_mm IS 'Ширина стропы в миллиметрах';
COMMENT ON COLUMN strop_specifications.plotnost_gr_mp IS 'Плотность в граммах на метр погонный';
COMMENT ON COLUMN strop_specifications.osnova_nit_type IS 'Тип нити основы: ПП = собственное производство, МФН = покупная нить';
COMMENT ON COLUMN strop_specifications.utok_vid_niti IS 'Тип нити утка - всегда МФН (мультифиламентная нить), покупается';
COMMENT ON COLUMN strop_specifications.is_fully_purchased IS 'TRUE если стропа полностью из покупной МФН нити (основа + уток)';
COMMENT ON COLUMN strop_specifications.mfn_rashod_kg IS 'Суммарный расход покупной МФН нити на 1 метр стропы в кг';
COMMENT ON COLUMN strop_specifications.receptura_pp_kg IS 'Расход полипропилена на 1м (только если основа из ПП)';

-- =====================================================
-- ВСТАВКА ДАННЫХ
-- =====================================================
INSERT INTO strop_specifications (
    kod_almas, nazvanie, shirina_mm, plotnost_gr_mp, tip,
    osnova_nit_type, osnova_denye, osnova_shirina_niti_sm, osnova_kol_nitey,
    osnova_kol_nitey_shpulyarnik, osnova_ves_9m_gr, osnova_itogo_kg,
    utok_denye, utok_vid_niti, utok_percent_v_1m,
    utok_kol_nitey_shpulyarnik, utok_ves_9m_gr, utok_itogo_kg,
    math_plotnost_gr_m2, razryv_po_osnove, elastichnost_po_osnove,
    ves_1_pogonnogo_m_gr, shirina_v_razvorote_mm, udelny_ves_m,
    percent_othodov, perevod_gr_na_kg,
    is_fully_purchased, receptura_itogo_kg, receptura_pp_kg,
    receptura_karbonat_kg, receptura_uf_kg, receptura_krasitel_kg,
    mfn_rashod_kg
) VALUES
(NULL, 'ПТ 50 мм-35 гр/мп', 50.0, 35.0, 'лента-тесьма', 'ПП', 1800, 4.5, 160.0, 160.0, 1.8, 0.0326, 900.0, 'МФН', 10.0, 10.0, 0.9, 0.0026, 35.2, 684.0, '18-25', 35.0, 50.0, 9.0, 0.02, 0.001, FALSE, 0.0324, 0.0305, 0.0013, 0.0007, 0.0002, 0.0026),
(NULL, 'ПТ 20 мм-6 гр/мп', 20.0, 6.0, 'лента-тесьма', 'МФН', 900, NULL, 36.0, 36.0, 0.9, 0.0037, 900.0, 'МФН', 65.0, 65.0, 0.9, 0.0023, 5.94, 76.95, '18-25', 6.0, 20.0, 9.0, 0.02, 0.001, TRUE, NULL, NULL, NULL, NULL, NULL, 0.0059),
(NULL, 'ПТ 20 мм-5 гр/мп', 20.0, 5.0, 'лента-тесьма', 'ПП', 1100, 3.0, 34.0, 34.0, 1.1, 0.0042, 900.0, 'МФН', 20.0, 10.0, 0.9, 0.0007, 4.9867, 88.825, '18-25', 5.0, 20.0, 9.0, 0.02, 0.001, FALSE, 0.0042, 0.004, 0.0002, 0.0001, 0.0, 0.0007);

-- =====================================================
-- ПОЛЕЗНЫЕ ЗАПРОСЫ
-- =====================================================

-- Все стропы с расшифровкой типа производства
SELECT 
    nazvanie as "Название",
    shirina_mm || ' мм' as "Ширина",
    plotnost_gr_mp || ' гр/мп' as "Плотность",
    osnova_nit_type as "Основа",
    CASE 
        WHEN is_fully_purchased THEN '100% покупная (МФН)'
        ELSE 'ПП (своё) + МФН (покупная)'
    END as "Тип производства",
    ROUND(mfn_rashod_kg * 1000, 2) || ' гр' as "МФН на 1м",
    CASE 
        WHEN receptura_pp_kg IS NOT NULL 
        THEN ROUND(receptura_pp_kg * 1000, 2) || ' гр' 
        ELSE '-' 
    END as "ПП на 1м"
FROM strop_specifications
ORDER BY shirina_mm DESC;

-- Расчёт материалов на заказ (пример: 1000 метров)
-- Показывает сколько нужно закупить МФН и сколько произвести ПП
SELECT 
    nazvanie as "Стропа",
    ROUND(mfn_rashod_kg * 1000, 2) as "МФН закупить, кг",
    ROUND(COALESCE(receptura_pp_kg, 0) * 1000, 2) as "ПП произвести, кг",
    ROUND(COALESCE(receptura_karbonat_kg, 0) * 1000, 3) as "Карбонат, кг",
    ROUND(COALESCE(receptura_uf_kg, 0) * 1000, 3) as "УФ стаб., кг",
    ROUND(COALESCE(receptura_krasitel_kg, 0) * 1000, 3) as "Краситель, кг"
FROM strop_specifications
WHERE is_active = TRUE;