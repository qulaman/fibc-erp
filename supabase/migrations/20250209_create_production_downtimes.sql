-- ============================================
-- ТАБЛИЦА УЧЕТА ПРОСТОЕВ ОБОРУДОВАНИЯ
-- Единая для всех производственных цехов
-- ============================================

CREATE TABLE IF NOT EXISTS production_downtimes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Привязка к оборудованию (определяет цех)
    machine_id UUID NOT NULL REFERENCES equipment(id),

    -- Время простоя
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Автоматический расчет длительности в минутах
    duration_minutes INTEGER GENERATED ALWAYS AS (
        EXTRACT(EPOCH FROM (end_time - start_time)) / 60
    ) STORED,

    -- Причина простоя
    reason TEXT NOT NULL,

    -- Дополнительная информация
    notes TEXT,

    -- Связь со сменой (опционально)
    shift TEXT,
    date DATE,

    -- Кто зафиксировал (опционально)
    recorded_by UUID,

    -- Метаданные
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Проверка: окончание должно быть после начала
    CONSTRAINT check_time_order CHECK (end_time > start_time)
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_downtimes_machine ON production_downtimes(machine_id);
CREATE INDEX IF NOT EXISTS idx_downtimes_date ON production_downtimes(date DESC);
CREATE INDEX IF NOT EXISTS idx_downtimes_reason ON production_downtimes(reason);
CREATE INDEX IF NOT EXISTS idx_downtimes_duration ON production_downtimes(duration_minutes);

-- Комментарии
COMMENT ON TABLE production_downtimes IS 'Учет простоев производственного оборудования во всех цехах';
COMMENT ON COLUMN production_downtimes.machine_id IS 'Оборудование (по нему определяется цех)';
COMMENT ON COLUMN production_downtimes.duration_minutes IS 'Длительность простоя в минутах (вычисляется автоматически)';
COMMENT ON COLUMN production_downtimes.reason IS 'Причина простоя';

-- RLS (Row Level Security)
ALTER TABLE production_downtimes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Все пользователи могут читать простои" ON production_downtimes;
CREATE POLICY "Все пользователи могут читать простои"
ON production_downtimes FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Все пользователи могут добавлять простои" ON production_downtimes;
CREATE POLICY "Все пользователи могут добавлять простои"
ON production_downtimes FOR INSERT
TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "Все пользователи могут обновлять простои" ON production_downtimes;
CREATE POLICY "Все пользователи могут обновлять простои"
ON production_downtimes FOR UPDATE
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Только админы могут удалять простои" ON production_downtimes;
CREATE POLICY "Только админы могут удалять простои"
ON production_downtimes FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM employees
        WHERE id = auth.uid()
        AND role = 'admin'
    )
);

-- VIEW: Простои с информацией о машине
CREATE OR REPLACE VIEW downtimes_with_equipment AS
SELECT
    d.id,
    d.machine_id,
    e.name AS machine_name,
    e.type AS machine_type,
    e.code AS machine_code,
    d.start_time,
    d.end_time,
    d.duration_minutes,
    d.reason,
    d.notes,
    d.shift,
    d.date,
    d.created_at,
    emp.full_name AS recorded_by_name
FROM production_downtimes d
LEFT JOIN equipment e ON e.id = d.machine_id
LEFT JOIN employees emp ON emp.id = d.recorded_by
ORDER BY d.start_time DESC;

COMMENT ON VIEW downtimes_with_equipment IS 'Простои с деталями оборудования';

-- Справочник причин простоев (для выпадающего списка)
CREATE TABLE IF NOT EXISTS downtime_reasons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Заполнение справочника причин
INSERT INTO downtime_reasons (code, name, category) VALUES
    ('thread_break', 'Обрыв нити', 'Технологические'),
    ('equipment_failure', 'Поломка оборудования', 'Технические'),
    ('no_material', 'Отсутствие сырья', 'Логистические'),
    ('batch_change', 'Смена партии/рецептуры', 'Плановые'),
    ('maintenance', 'Плановое обслуживание', 'Плановые'),
    ('quality_check', 'Контроль качества', 'Плановые'),
    ('operator_break', 'Перерыв оператора', 'Организационные'),
    ('power_outage', 'Отключение электроэнергии', 'Внешние'),
    ('other', 'Другое', 'Прочие')
ON CONFLICT (code) DO NOTHING;

-- RLS для справочника
ALTER TABLE downtime_reasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Все могут читать причины простоев" ON downtime_reasons;
CREATE POLICY "Все могут читать причины простоев"
ON downtime_reasons FOR SELECT
TO authenticated
USING (true);

COMMENT ON TABLE downtime_reasons IS 'Справочник причин простоев оборудования';
