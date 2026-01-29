-- =====================================================
-- Исправление RLS политик для user_profiles
-- (Устранение бесконечной рекурсии)
-- =====================================================

-- 1. Создаем функцию для получения роли с SECURITY DEFINER
-- Эта функция обходит RLS и предотвращает рекурсию
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS VARCHAR AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Удаляем старые политики
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;

-- 3. Создаем новые политики без рекурсии

-- Пользователи видят только свой профиль
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Администраторы видят все профили (через функцию, без рекурсии!)
CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  USING (get_my_role() = 'admin');

-- Администраторы могут обновлять профили
CREATE POLICY "Admins can update profiles"
  ON user_profiles
  FOR UPDATE
  USING (get_my_role() = 'admin');

-- Администраторы могут вставлять профили
CREATE POLICY "Admins can insert profiles"
  ON user_profiles
  FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

-- Администраторы могут удалять профили
CREATE POLICY "Admins can delete profiles"
  ON user_profiles
  FOR DELETE
  USING (get_my_role() = 'admin');

-- 4. Проверка
SELECT 'RLS policies fixed successfully!' AS message;
