-- Модуль планирования производства
-- Журнал заказов и задания цехам

CREATE TABLE IF NOT EXISTS production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  product_type TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','confirmed','in_progress','completed','cancelled')),
  priority TEXT DEFAULT 'Средний',
  deadline DATE,
  customer_name TEXT,
  params JSONB NOT NULL,
  calculation JSONB NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS production_order_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
  department TEXT NOT NULL,
  task_description TEXT NOT NULL,
  required_quantity NUMERIC(12,2),
  required_unit TEXT,
  current_stock NUMERIC(12,2) DEFAULT 0,
  deficit NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'Новая',
  task_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status);
CREATE INDEX IF NOT EXISTS idx_production_orders_created ON production_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_production_order_tasks_order ON production_order_tasks(order_id);

ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_order_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON production_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON production_order_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
