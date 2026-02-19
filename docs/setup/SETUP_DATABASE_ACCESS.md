# Установка полного доступа к схеме БД

## Проблема
Claude не видит полную схему БД и создает дублирующие таблицы или использует несуществующие.

## Решение: Docker + Supabase CLI + Полный дамп схемы

### Шаг 1: Установка Docker Desktop

1. **Скачайте Docker Desktop:**
   - Перейдите: https://www.docker.com/products/docker-desktop/
   - Скачайте версию для Windows
   - Запустите установщик `Docker Desktop Installer.exe`

2. **После установки:**
   - Перезагрузите компьютер (если требуется)
   - Запустите Docker Desktop
   - Дождитесь запуска (значок Docker в системном трее станет зеленым)
   - Проверьте в PowerShell:
     ```powershell
     docker --version
     ```

### Шаг 2: Получение полного дампа схемы через Supabase CLI

После установки Docker выполните:

```powershell
# 1. Перейдите в директорию проекта
cd C:\Users\Turing\fibc-erp

# 2. Получите полный дамп схемы (теперь Docker доступен)
npx supabase db dump --db-url "postgresql://postgres.mgslapkswztsonyooogm:Qq6391463!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" --schema public > supabase/current_schema.sql

# 3. Или используйте локальную переменную
$DB_URL = "postgresql://postgres.mgslapkswztsonyooogm:Qq6391463!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
npx supabase db dump --db-url $DB_URL --schema public > supabase/current_schema.sql
```

### Шаг 3: Альтернатива - SQL запрос для полной схемы

Если Docker вызывает проблемы, выполните этот SQL в Supabase SQL Editor:

```sql
-- СОХРАНИТЕ РЕЗУЛЬТАТ В ФАЙЛ supabase/full_schema_export.sql

-- 1. Все таблицы с полной структурой
SELECT
    'TABLE: ' || table_name as info,
    column_name,
    data_type,
    character_maximum_length,
    column_default,
    is_nullable,
    CASE
        WHEN column_name IN (
            SELECT column_name
            FROM information_schema.key_column_usage
            WHERE table_name = c.table_name
            AND constraint_name LIKE '%_pkey'
        ) THEN 'PRIMARY KEY'
        ELSE ''
    END as key_type
FROM information_schema.columns c
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- 2. Все внешние ключи
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.table_name, kcu.column_name;

-- 3. Все функции (RPC)
SELECT
    routine_name,
    routine_type,
    data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- 4. Параметры всех функций
SELECT
    r.routine_name,
    p.parameter_name,
    p.data_type,
    p.parameter_mode,
    p.ordinal_position
FROM information_schema.routines r
LEFT JOIN information_schema.parameters p
    ON r.specific_name = p.specific_name
WHERE r.routine_schema = 'public'
ORDER BY r.routine_name, p.ordinal_position;

-- 5. Индексы
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 6. Views
SELECT
    table_name as view_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
```

### Шаг 4: Создание постоянного файла схемы

После получения схемы любым способом, сохраните её в:
- `supabase/current_schema.sql` - полный дамп с CREATE TABLE
- `supabase/schema_reference.md` - человекочитаемая документация

### Шаг 5: Регулярное обновление схемы

Создайте скрипт для автоматического обновления:

```powershell
# scripts/update-schema.ps1
$DB_URL = "postgresql://postgres.mgslapkswztsonyooogm:Qq6391463!@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"
npx supabase db dump --db-url $DB_URL --schema public > supabase/current_schema.sql
Write-Host "✅ Schema updated: $(Get-Date)" -ForegroundColor Green
```

## Зачем это нужно?

С полной схемой в файле `supabase/current_schema.sql`:
- ✅ Claude увидит все существующие таблицы
- ✅ Не будет дублировать таблицы
- ✅ Увидит все связи и внешние ключи
- ✅ Узнает правильные названия колонок
- ✅ Сможет корректно писать миграции

## Что делать прямо сейчас?

**Вариант А (рекомендуемый):**
1. Установите Docker Desktop (15 минут)
2. Запустите команду `npx supabase db dump`
3. Получите файл `current_schema.sql`

**Вариант Б (быстрый):**
1. Откройте Supabase SQL Editor
2. Выполните SQL запрос выше (6 блоков)
3. Скопируйте результаты в `supabase/full_schema_export.txt`
4. Покажите файл Claude

## Следующий шаг

После установки Docker и получения схемы:
```powershell
# Покажите схему Claude
cat supabase/current_schema.sql
```

Тогда Claude сможет видеть ВСЮ структуру БД и избежать ошибок!
