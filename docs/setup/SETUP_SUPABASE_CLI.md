# Подключение Supabase CLI к проекту

## Шаг 1: Получите Project ID и Database Password

1. Откройте **Supabase Dashboard**
2. Перейдите в **Settings** → **General**
3. Скопируйте **Reference ID** (это ваш Project ID)
4. Перейдите в **Settings** → **Database**
5. Скопируйте **Connection String** или сбросьте **Database Password**

## Шаг 2: Инициализация Supabase в проекте

```bash
cd c:/Users/Turing/fibc-erp
npx supabase init
```

Это создаст файл `config.toml` в папке `supabase/`.

## Шаг 3: Подключение к вашему проекту

```bash
npx supabase login
```

Откроется браузер для авторизации.

Затем:

```bash
npx supabase link --project-ref YOUR_PROJECT_ID
```

Замените `YOUR_PROJECT_ID` на ваш Reference ID.

## Шаг 4: Получение полной схемы базы данных

```bash
npx supabase db dump --schema public > supabase/current_schema.sql
```

Это создаст файл `current_schema.sql` со ВСЕЙ структурой БД.

## Шаг 5: Получение только структуры таблиц (без данных)

```bash
npx supabase db dump --schema public --data-only=false > supabase/schema_only.sql
```

## Быстрая команда для получения списка таблиц

```bash
npx supabase db dump --schema public --schema-only | grep "CREATE TABLE"
```

---

## Альтернатива: Ручной способ через SQL

Если CLI не работает, выполните SQL из файла `get_schema.sql` и пришлите результаты.
