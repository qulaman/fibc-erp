-- ============================================
-- СОЗДАНИЕ ТАБЛИЦЫ СКЛАДА НИТИ
-- Таблица для хранения готовой нити с экструзии
-- ============================================

-- Создание таблицы yarn_warehouse
CREATE TABLE IF NOT EXISTS yarn_warehouse (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Параметры нити
    yarn_name TEXT NOT NULL,
    yarn_denier INTEGER NOT NULL,
    width_mm NUMERIC(10,2) NOT NULL,
    color TEXT NOT NULL,

    -- Партия и баланс
    batch_number TEXT UNIQUE NOT NULL,
    balance_kg NUMERIC(10,2) NOT NULL DEFAULT 0,
    unit TEXT DEFAULT 'kg',

    -- Метаданные
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_yarn_warehouse_batch_number
ON yarn_warehouse(batch_number);

CREATE INDEX IF NOT EXISTS idx_yarn_warehouse_yarn_denier
ON yarn_warehouse(yarn_denier);

CREATE INDEX IF NOT EXISTS idx_yarn_warehouse_color
ON yarn_warehouse(color);

CREATE INDEX IF NOT EXISTS idx_yarn_warehouse_balance
ON yarn_warehouse(balance_kg) WHERE balance_kg > 0;

-- Комментарии
COMMENT ON TABLE yarn_warehouse IS 'Склад готовой нити после экструзии';
COMMENT ON COLUMN yarn_warehouse.yarn_name IS 'Полное название нити (например: Нить ПП 1000D Белый (2.5мм))';
COMMENT ON COLUMN yarn_warehouse.yarn_denier IS 'Денье (толщина) нити';
COMMENT ON COLUMN yarn_warehouse.width_mm IS 'Ширина нити в мм';
COMMENT ON COLUMN yarn_warehouse.color IS 'Цвет нити';
COMMENT ON COLUMN yarn_warehouse.batch_number IS 'Уникальный номер партии';
COMMENT ON COLUMN yarn_warehouse.balance_kg IS 'Остаток на складе в килограммах';

-- Триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_yarn_warehouse_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_yarn_warehouse_updated_at
BEFORE UPDATE ON yarn_warehouse
FOR EACH ROW
EXECUTE FUNCTION update_yarn_warehouse_updated_at();

-- RLS (Row Level Security) - разрешить всем authenticated пользователям
ALTER TABLE yarn_warehouse ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Все пользователи могут читать склад нити"
ON yarn_warehouse FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Все пользователи могут добавлять на склад нити"
ON yarn_warehouse FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Все пользователи могут обновлять склад нити"
ON yarn_warehouse FOR UPDATE
TO authenticated
USING (true);

-- VIEW: Активный баланс нити (только положительные остатки)
CREATE OR REPLACE VIEW yarn_warehouse_active AS
SELECT
    id,
    yarn_name,
    yarn_denier,
    width_mm,
    color,
    batch_number,
    balance_kg,
    unit,
    created_at,
    updated_at
FROM yarn_warehouse
WHERE balance_kg > 0
ORDER BY created_at DESC;

COMMENT ON VIEW yarn_warehouse_active IS 'Активный склад нити с положительным балансом';
