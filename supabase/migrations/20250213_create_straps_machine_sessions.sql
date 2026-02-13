-- ============================================================
-- Миграция: Сессии производства строп на станках
-- Аналог weaving_rolls — для отслеживания занятости станков
-- ============================================================

-- 1. Таблица сессий
CREATE TABLE IF NOT EXISTS public.straps_machine_sessions (
    id            UUID DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    machine_id    UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
    operator_id   UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    spec_name     VARCHAR(100),
    status        VARCHAR(20) NOT NULL DEFAULT 'active',
    -- 'active'    = станок занят, идёт производство
    -- 'completed' = сессия завершена, станок свободен

    -- Партии сырья (выбираются при создании, списываются при завершении)
    weft_item_id  TEXT,           -- ID партии утка (material_code МФН)
    weft_source   VARCHAR(10) DEFAULT 'mfn', -- 'mfn' | 'yarn'
    warp_item_id  TEXT,           -- ID партии основы (UUID нити или material_code МФН)
    warp_source   VARCHAR(10) DEFAULT 'yarn', -- 'mfn' | 'yarn'

    started_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at      TIMESTAMP WITH TIME ZONE,
    total_length  NUMERIC(10,2) DEFAULT 0,
    total_weight  NUMERIC(10,2) DEFAULT 0,
    defect_weight NUMERIC(10,3) DEFAULT 0,
    notes         TEXT,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE public.straps_machine_sessions IS
    'Сессии производства строп — аналог weaving_rolls. status=active означает что станок занят.';

-- 2. Индексы
CREATE INDEX IF NOT EXISTS idx_straps_sessions_machine_id
    ON public.straps_machine_sessions(machine_id);

CREATE INDEX IF NOT EXISTS idx_straps_sessions_status
    ON public.straps_machine_sessions(status);

-- 3. Привязать production_straps к сессии
ALTER TABLE public.production_straps
    ADD COLUMN IF NOT EXISTS session_id UUID
        REFERENCES public.straps_machine_sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_production_straps_session_id
    ON public.production_straps(session_id);

-- 4. RLS
ALTER TABLE public.straps_machine_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "straps_sessions_allow_all" ON public.straps_machine_sessions
    FOR ALL USING (true) WITH CHECK (true);

-- 5. Права
GRANT ALL ON TABLE public.straps_machine_sessions TO anon;
GRANT ALL ON TABLE public.straps_machine_sessions TO authenticated;
GRANT ALL ON TABLE public.straps_machine_sessions TO service_role;
