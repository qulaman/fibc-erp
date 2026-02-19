# Настройка базы данных Supabase для ERP

## Порядок применения миграций

Выполните SQL-запросы в **указанном порядке** через Supabase Dashboard → SQL Editor.

### Шаг 1: Добавление поля work_status в employees

**Файл:** `supabase/migrations/20250209_add_work_status_to_employees.sql`

```sql
-- Добавление поля work_status в таблицу employees
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS work_status TEXT CHECK (work_status IN ('active', 'vacation', 'sick_leave'));

-- Установить значение по умолчанию 'active' для всех активных сотрудников
UPDATE employees
SET work_status = 'active'
WHERE is_active = TRUE AND work_status IS NULL;

-- Комментарий к колонке
COMMENT ON COLUMN employees.work_status IS 'Статус работы сотрудника: active, vacation, sick_leave';
```

**Цель:** Добавляет возможность отслеживать статус работы сотрудника (активен, в отпуске, на больничном).

---

### Шаг 2: Создание таблиц для модуля экструзии

**Файл:** `supabase/migrations/20250209_create_extrusion_tables.sql`

```sql
-- Скопируйте весь код из файла
```

**Создает:**
- ✅ `production_extrusion` - таблица производства экструзии
- ✅ `yarn_warehouse` - склад готовой нити (ПП)

**Важные поля:**
- `operator_id` - главный оператор экструдера
- `operator_winder1`, `operator_winder2`, `operator_winder3` - три намотчика
- `yarn_denier` - плотность нити (900D, 1000D, 1200D и т.д.)
- `width_mm` - ширина нити (обычно 2.5 мм)
- `color` - цвет нити (Белый, Черный и т.д.)
- `batch_number` - уникальный номер партии

---

### Шаг 3: Создание RPC функции register_extrusion_output

**Файл:** `supabase/migrations/20250209_create_register_extrusion_output.sql`

```sql
-- Скопируйте весь код из файла
```

**Создает функцию**, которая:
1. Регистрирует выпуск партии нити в `production_extrusion`
2. Автоматически добавляет продукцию на `yarn_warehouse`
3. Обновляет баланс, если партия с таким номером уже существует

**Параметры функции:**
- `p_date` - дата производства
- `p_shift` - смена (День/Ночь)
- `p_machine_id` - ID оборудования
- `p_operator_id` - ID главного оператора
- `p_operator_winder1/2/3` - ID намотчиков
- `p_yarn_name` - название нити (например: "Нить ПП 1000D Белый (2.5мм)")
- `p_yarn_denier` - денье (900, 1000, 1200...)
- `p_width_mm` - ширина в мм
- `p_color` - цвет
- `p_batch_number` - номер партии
- `p_weight_kg` - вес выпущенной продукции
- `p_notes` - примечания

---

## Проверка успешности применения

После выполнения всех миграций проверьте:

### 1. Таблица employees

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'employees' AND column_name = 'work_status';
```

**Ожидаемый результат:** 1 строка с `work_status | text`

### 2. Таблица production_extrusion

```sql
SELECT COUNT(*) FROM production_extrusion;
```

**Ожидаемый результат:** 0 (таблица пустая, но существует)

### 3. Таблица yarn_warehouse

```sql
SELECT COUNT(*) FROM yarn_warehouse;
```

**Ожидаемый результат:** 0 (таблица пустая, но существует)

### 4. Функция register_extrusion_output

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_name = 'register_extrusion_output'
  AND routine_schema = 'public';
```

**Ожидаемый результат:** 1 строка с названием функции

---

## Тестирование работы модуля экструзии

После применения миграций:

1. Откройте страницу `/production/extrusion`
2. Заполните форму:
   - Выберите дату
   - Выберите смену (День/Ночь)
   - Выберите линию экструдера
   - Выберите оператора и намотчиков
   - Выберите тип нити (Денье)
   - Выберите цвет и ширину
   - Введите вес выпущенной продукции
3. Нажмите "Выпустить Партию"

**Ожидаемый результат:**
- ✅ Появится сообщение "Смена закрыта!"
- ✅ Запись появится в таблице `production_extrusion`
- ✅ Продукция автоматически добавится на склад `yarn_warehouse`

---

## Возможные ошибки и решения

### Ошибка: "relation production_extrusion does not exist"

**Решение:** Вы пропустили Шаг 2. Выполните миграцию создания таблиц.

### Ошибка: "function register_extrusion_output does not exist"

**Решение:**
1. Убедитесь, что таблицы созданы (Шаг 2)
2. Выполните Шаг 3 (создание функции)

### Ошибка: "insert or update on table violates foreign key constraint"

**Решение:**
- Убедитесь, что таблица `equipment` содержит записи для экструдеров
- Убедитесь, что таблица `employees` содержит операторов с department='extrusion'

### Ошибка: "column work_status does not exist"

**Решение:** Выполните Шаг 1 (добавление work_status)

---

## Структура данных после применения

```
employees
├── id (UUID)
├── full_name (TEXT)
├── role (TEXT)
├── department (TEXT)
├── birth_date (DATE)
├── is_active (BOOLEAN)
└── work_status (TEXT) ← НОВОЕ ПОЛЕ

production_extrusion
├── id (UUID)
├── date (DATE)
├── shift (TEXT)
├── machine_id (UUID → equipment)
├── operator_id (UUID → employees)
├── operator_winder1 (UUID → employees)
├── operator_winder2 (UUID → employees)
├── operator_winder3 (UUID → employees)
├── yarn_name (TEXT)
├── yarn_denier (INTEGER)
├── width_mm (NUMERIC)
├── color (TEXT)
├── batch_number (TEXT)
├── output_weight_kg (NUMERIC)
├── notes (TEXT)
└── status (TEXT)

yarn_warehouse
├── id (UUID)
├── yarn_name (TEXT)
├── yarn_denier (INTEGER)
├── width_mm (NUMERIC)
├── color (TEXT)
├── batch_number (TEXT)
├── balance_kg (NUMERIC)
└── unit (TEXT)
```

---

## Дополнительные требования

### Таблица equipment

Убедитесь, что в таблице `equipment` есть записи с `type = 'extruder'`:

```sql
-- Пример добавления линий экструзии
INSERT INTO equipment (name, code, type, is_active) VALUES
('Экструдер №1', 'EX1', 'extruder', true),
('Экструдер №2', 'EX2', 'extruder', true),
('Экструдер №3', 'EX3', 'extruder', true)
ON CONFLICT DO NOTHING;
```

### Таблица employees

Добавьте операторов экструзии:

```sql
-- Пример добавления операторов
INSERT INTO employees (full_name, role, department, is_active, work_status) VALUES
('Иванов Иван Иванович', 'operator_extruder', 'extrusion', true, 'active'),
('Петров Петр Петрович', 'operator_winder', 'extrusion', true, 'active'),
('Сидоров Сидор Сидорович', 'operator_winder', 'extrusion', true, 'active')
ON CONFLICT DO NOTHING;
```

---

## Поддержка

Если после применения всех миграций проблемы остаются:
1. Проверьте логи ошибок в браузере (F12 → Console)
2. Проверьте RLS (Row Level Security) политики в Supabase
3. Убедитесь, что все таблицы имеют правильные разрешения

**Версия:** 1.1
**Дата:** 09.02.2025
**Автор:** Claude Code
