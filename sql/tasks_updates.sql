-- Добавляем поле приоритета в существующую таблицу
ALTER TABLE tasks_from_management
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Средний';

-- Создаем таблицу для истории изменений задач
CREATE TABLE IF NOT EXISTS task_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks_from_management(id) ON DELETE CASCADE,
  changed_by TEXT NOT NULL, -- Кто изменил (email пользователя)
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  field_name TEXT NOT NULL, -- Какое поле изменено (status, progress_percent, etc.)
  old_value TEXT, -- Старое значение
  new_value TEXT, -- Новое значение
  comment TEXT -- Дополнительный комментарий
);

-- Индексы для истории изменений
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_change_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_changed_at ON task_change_history(changed_at DESC);

-- RLS для истории изменений
ALTER TABLE task_change_history ENABLE ROW LEVEL SECURITY;

-- Все могут читать историю
CREATE POLICY "Enable read access for all users" ON task_change_history
  FOR SELECT USING (true);

-- Все могут добавлять в историю
CREATE POLICY "Enable insert access for all users" ON task_change_history
  FOR INSERT WITH CHECK (true);

-- Комментарий к полям
COMMENT ON COLUMN tasks_from_management.priority IS 'Приоритет: Высокий, Средний, Низкий';
COMMENT ON TABLE task_change_history IS 'История всех изменений задач для аудита';
