-- =====================================================
-- Настройка системы авторизации на базе Supabase Auth
-- =====================================================

-- 1. Таблица профилей пользователей
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'operator',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Комментарии
COMMENT ON TABLE user_profiles IS 'Профили пользователей системы с привязкой к сотрудникам';
COMMENT ON COLUMN user_profiles.role IS 'Роль: admin, manager, operator, warehouse, qc, accountant';
COMMENT ON COLUMN user_profiles.employee_id IS 'Связь с сотрудником (опционально)';

-- 3. Индексы
CREATE INDEX IF NOT EXISTS idx_user_profiles_employee ON user_profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- 4. Функция для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, role, is_active)
  VALUES (NEW.id, 'operator', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Триггер на создание нового пользователя
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 6. Функция для получения роли (нужна ДО создания политик)
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS VARCHAR AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 7. RLS (Row Level Security) политики
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики если они есть
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON user_profiles;

-- Политика: пользователи видят только свой профиль
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Политика: администраторы видят все профили
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (get_my_role() = 'admin');

-- Политика: администраторы могут обновлять профили
CREATE POLICY "Admins can update profiles"
  ON user_profiles
  FOR UPDATE
  USING (get_my_role() = 'admin');

-- Политика: администраторы могут вставлять профили
CREATE POLICY "Admins can insert profiles"
  ON user_profiles
  FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

-- Политика: администраторы могут удалять профили
CREATE POLICY "Admins can delete profiles"
  ON user_profiles
  FOR DELETE
  USING (get_my_role() = 'admin');

-- 8. View для удобного получения данных пользователя с сотрудником
CREATE OR REPLACE VIEW user_profiles_with_employee AS
SELECT
  up.id,
  up.employee_id,
  up.role,
  up.is_active,
  up.created_at,
  e.full_name,
  e.role as position,
  au.email
FROM user_profiles up
LEFT JOIN employees e ON up.employee_id = e.id
LEFT JOIN auth.users au ON up.id = au.id;

-- 9. Функция для получения роли текущего пользователя (legacy, используйте get_my_role)
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS VARCHAR AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 10. Функция проверки прав доступа
CREATE OR REPLACE FUNCTION public.has_role(required_role VARCHAR)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND role = required_role
    AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- Создание первого администратора
-- =====================================================
-- ВАЖНО: После создания пользователя через Supabase Dashboard
-- или через API, нужно обновить его роль на 'admin':
--
-- UPDATE user_profiles SET role = 'admin' WHERE id = '[user_id]';
--
-- Или используйте функцию ниже после создания первого пользователя
-- =====================================================

-- Функция для установки роли администратора по email
CREATE OR REPLACE FUNCTION public.set_admin_by_email(user_email TEXT)
RETURNS VOID AS $$
DECLARE
  user_id UUID;
BEGIN
  SELECT id INTO user_id FROM auth.users WHERE email = user_email;

  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;

  UPDATE user_profiles SET role = 'admin', is_active = true WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Пример использования (раскомментируйте и замените email):
-- SELECT set_admin_by_email('admin@example.com');

SELECT 'Auth setup completed successfully!' AS message;
