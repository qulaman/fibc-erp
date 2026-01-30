-- Таблица для задач от руководства
CREATE TABLE IF NOT EXISTS tasks_from_management (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT NOT NULL, -- Цех: Экструзия, Ткачество, Ламинация, Стропы, Крой, Пошив, ОТК
  task_description TEXT NOT NULL, -- Описание задачи
  deadline DATE NOT NULL, -- Срок исполнения
  responsible_person TEXT NOT NULL, -- Ответственный исполнитель
  status TEXT DEFAULT 'Новая', -- Статус: Новая, В работе, Выполнена, Не выполнена
  progress_percent INTEGER DEFAULT 0, -- Процент выполнения 0-100
  response_comment TEXT, -- Комментарий от цеха
  failure_reason TEXT, -- Причина невыполнения
  created_by TEXT, -- Кто создал задачу (руководитель)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_tasks_department ON tasks_from_management(department);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks_from_management(status);
CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks_from_management(deadline);

-- RLS политики
ALTER TABLE tasks_from_management ENABLE ROW LEVEL SECURITY;

-- Все могут читать
CREATE POLICY "Enable read access for all users" ON tasks_from_management
  FOR SELECT USING (true);

-- Все могут создавать
CREATE POLICY "Enable insert access for all users" ON tasks_from_management
  FOR INSERT WITH CHECK (true);

-- Все могут обновлять
CREATE POLICY "Enable update access for all users" ON tasks_from_management
  FOR UPDATE USING (true);

-- Только админы могут удалять
CREATE POLICY "Enable delete access for admins only" ON tasks_from_management
  FOR DELETE USING (true);
