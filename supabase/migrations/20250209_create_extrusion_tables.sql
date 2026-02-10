-- Создание таблиц для модуля экструзии

-- 1. Таблица производства экструзии
CREATE TABLE IF NOT EXISTS production_extrusion (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    shift TEXT NOT NULL CHECK (shift IN ('День', 'Ночь')),
    machine_id UUID REFERENCES equipment(id),
    operator_id UUID REFERENCES employees(id),
    operator_winder1 UUID REFERENCES employees(id),
    operator_winder2 UUID REFERENCES employees(id),
    operator_winder3 UUID REFERENCES employees(id),
    yarn_name TEXT NOT NULL,
    yarn_denier INTEGER NOT NULL,
    width_mm NUMERIC(10,2) DEFAULT 2.5,
    color TEXT DEFAULT 'Белый',
    batch_number TEXT NOT NULL,
    output_weight_kg NUMERIC(10,2) NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для производительности
CREATE INDEX IF NOT EXISTS idx_production_extrusion_date ON production_extrusion(date DESC);
CREATE INDEX IF NOT EXISTS idx_production_extrusion_batch ON production_extrusion(batch_number);
CREATE INDEX IF NOT EXISTS idx_production_extrusion_machine ON production_extrusion(machine_id);

-- 2. Таблица склада нити (ПП)
CREATE TABLE IF NOT EXISTS yarn_warehouse (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    yarn_name TEXT NOT NULL,
    yarn_denier INTEGER NOT NULL,
    width_mm NUMERIC(10,2) DEFAULT 2.5,
    color TEXT DEFAULT 'Белый',
    batch_number TEXT NOT NULL,
    balance_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
    unit TEXT DEFAULT 'kg',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(yarn_name, batch_number)
);

-- Индексы для склада нити
CREATE INDEX IF NOT EXISTS idx_yarn_warehouse_batch ON yarn_warehouse(batch_number);
CREATE INDEX IF NOT EXISTS idx_yarn_warehouse_denier ON yarn_warehouse(yarn_denier);
CREATE INDEX IF NOT EXISTS idx_yarn_warehouse_balance ON yarn_warehouse(balance_kg);

-- Комментарии к таблицам
COMMENT ON TABLE production_extrusion IS 'Производство экструзии - выпуск нити';
COMMENT ON TABLE yarn_warehouse IS 'Склад нити (ПП) - готовая продукция экструзии';

-- Комментарии к колонкам production_extrusion
COMMENT ON COLUMN production_extrusion.operator_id IS 'Оператор экструдера';
COMMENT ON COLUMN production_extrusion.operator_winder1 IS 'Намотчик 1';
COMMENT ON COLUMN production_extrusion.operator_winder2 IS 'Намотчик 2';
COMMENT ON COLUMN production_extrusion.operator_winder3 IS 'Намотчик 3';
COMMENT ON COLUMN production_extrusion.yarn_denier IS 'Плотность нити в денье (напр. 900, 1000, 1200)';
COMMENT ON COLUMN production_extrusion.width_mm IS 'Ширина нити в мм (обычно 2.5)';
COMMENT ON COLUMN production_extrusion.batch_number IS 'Номер партии (формат: YYMMDD-Смена-Линия-ДеньеЦвет)';
