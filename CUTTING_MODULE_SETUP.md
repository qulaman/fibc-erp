# Установка модуля кроя

## Что было создано

### 1. База данных
Файл миграции: `supabase/migrations/20250122_create_cutting_module.sql`

Создаёт:
- **3 таблицы**: `cutting_types`, `production_cutting`, `cutting_parts_warehouse`
- **1 представление**: `cutting_parts_balance` (остатки деталей)
- **Триггеры** для автоматического обновления `updated_at`
- **Тестовые данные**: 6 типов кроя (донышки, боковины, петли)

### 2. Страницы приложения

#### Производство кроя
**URL**: `/production/cutting`
**Функционал**:
- Переключатель типа материала (Ткань/Ламинат или Стропа)
- Выбор смены и оператора
- Выбор материала из доступных остатков
- Выбор типа детали
- Ввод количества и отходов
- Автоматический расчёт расхода материала
- Проверка достаточности материала

#### Журнал производства кроя
**URL**: `/production/cutting/history`
**Функционал**:
- История всех операций раскроя
- Фильтры по типу материала и статусу
- Поиск по документам, операторам, деталям
- Сводная статистика

#### Склад кроеных деталей
**URL**: `/warehouse/cutting`
**Функционал**:
- Два режима: Остатки и История движений
- Фильтры по категориям
- Трассировка материалов

### 3. Навигация
Добавлены пункты меню:
- **Производство** → "Крой" и "Журнал Кроя"
- **Склад** → "Кроеные детали"

## Применение миграции

### Вариант 1: Через Supabase Dashboard (Рекомендуется)

1. Откройте Supabase Dashboard: https://app.supabase.com
2. Выберите ваш проект
3. Перейдите в **SQL Editor**
4. Откройте файл `supabase/migrations/20250122_create_cutting_module.sql`
5. Скопируйте весь SQL код
6. Вставьте в SQL Editor
7. Нажмите **Run**

### Вариант 2: Через Supabase CLI

```bash
# Если у вас установлен Supabase CLI
supabase db push
```

### Вариант 3: Создать таблицы вручную

Если миграция не работает, создайте таблицы вручную через SQL Editor:

```sql
-- 1. Справочник типов кроя
CREATE TABLE cutting_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  material_type TEXT NOT NULL CHECK (material_type IN ('Ткань', 'Ткань/Ламинат', 'Ламинат', 'Стропа')),
  width_cm NUMERIC(10,2),
  length_cm NUMERIC(10,2),
  consumption_cm NUMERIC(10,2) NOT NULL,
  weight_g NUMERIC(10,2),
  description TEXT,
  status TEXT DEFAULT 'Активно' CHECK (status IN ('Активно', 'Неактивно')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Журнал производства кроя
CREATE TABLE production_cutting (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doc_number TEXT NOT NULL UNIQUE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME NOT NULL DEFAULT CURRENT_TIME,
  shift TEXT CHECK (shift IN ('День', 'Ночь')),
  operator TEXT NOT NULL,
  roll_number TEXT NOT NULL,
  material_type TEXT NOT NULL CHECK (material_type IN ('Ткань', 'Ламинат', 'Стропа')),
  material_code TEXT NOT NULL,
  total_used_m NUMERIC(10,2) NOT NULL,
  cutting_type_category TEXT NOT NULL,
  cutting_type_code TEXT NOT NULL,
  cutting_type_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  consumption_m NUMERIC(10,2) NOT NULL,
  waste_m NUMERIC(10,2) DEFAULT 0,
  total_weight_kg NUMERIC(10,2),
  status TEXT DEFAULT 'Проведено' CHECK (status IN ('Черновик', 'В работе', 'Проведено', 'Отменено')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Склад кроеных деталей
CREATE TABLE cutting_parts_warehouse (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  doc_number TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  time TIME NOT NULL DEFAULT CURRENT_TIME,
  operation TEXT NOT NULL CHECK (operation IN ('Приход', 'Расход')),
  cutting_type_code TEXT NOT NULL,
  cutting_type_name TEXT NOT NULL,
  category TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  source_number TEXT,
  operator TEXT,
  status TEXT DEFAULT 'Проведено' CHECK (status IN ('Черновик', 'Проведено', 'Отменено')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Представление остатков
CREATE OR REPLACE VIEW cutting_parts_balance AS
SELECT
  cutting_type_code,
  cutting_type_name,
  category,
  SUM(CASE WHEN operation = 'Приход' THEN quantity ELSE 0 END) as total_received,
  SUM(CASE WHEN operation = 'Расход' THEN quantity ELSE 0 END) as total_used,
  SUM(CASE WHEN operation = 'Приход' THEN quantity ELSE -quantity END) as balance
FROM cutting_parts_warehouse
WHERE status = 'Проведено'
GROUP BY cutting_type_code, cutting_type_name, category
HAVING SUM(CASE WHEN operation = 'Приход' THEN quantity ELSE -quantity END) > 0;

-- 5. Тестовые данные
INSERT INTO cutting_types (code, category, name, material_type, width_cm, length_cm, consumption_cm, weight_g, description) VALUES
('DON-90-90', 'Донышко', 'Донышко квадратное 90x90 см', 'Ткань', 90, 90, 95, 180, 'Донышко для стандартного мешка'),
('BOK-180-90', 'Боковина', 'Боковина 180x90 см', 'Ткань/Ламинат', 180, 90, 185, 320, 'Боковая стенка мешка'),
('BOK-200-100', 'Боковина', 'Боковина 200x100 см', 'Ткань/Ламинат', 200, 100, 205, 400, 'Увеличенная боковина'),
('PET-40-15', 'Петля', 'Петля 40см ширина 15мм', 'Стропа', NULL, 40, 45, 25, 'Стандартная подъемная петля'),
('PET-50-20', 'Петля', 'Петля 50см ширина 20мм', 'Стропа', NULL, 50, 55, 35, 'Усиленная петля'),
('ZAP-30-15', 'Запчасть', 'Запорная лента 30см', 'Стропа', NULL, 30, 32, 18, 'Лента для запора мешка');
```

## Проверка работы

1. **Запустите dev сервер**:
   ```bash
   npm run dev
   ```

2. **Откройте страницы**:
   - http://localhost:3000/production/cutting - Производство кроя
   - http://localhost:3000/production/cutting/history - Журнал
   - http://localhost:3000/warehouse/cutting - Склад деталей

3. **Проверьте навигацию**:
   - В левом меню должны появиться новые пункты в разделах "Производство" и "Склад"

## Требования к данным

Для работы модуля кроя необходимо наличие:

### 1. Таблицы балансов материалов
- `weaving_rolls_balance` - остатки рулонов ткачества
- `laminated_rolls_balance` - остатки ламинированных рулонов
- `straps_warehouse_balance` - остатки строп

### 2. Таблицы складов для списания
- `weaving_warehouse` - склад ткачества
- `lamination_warehouse` - склад ламинации
- `straps_warehouse` - склад строп

## Бизнес-процесс

1. **Оператор выбирает тип материала**: Ткань/Ламинат или Стропы
2. **Выбирает материал** из доступных остатков на складе
3. **Выбирает тип кроя** (деталь) из справочника
4. **Указывает количество** и отходы
5. **Система автоматически**:
   - Рассчитывает расход материала (из см в метры)
   - Проверяет достаточность материала
   - Создаёт документ производства
   - Списывает материал со склада
   - Оприходует детали на склад кроеных деталей
   - Записывает трассировку

## Формат данных

### Расход материала
- В справочнике `cutting_types` поле `consumption_cm` в **сантиметрах**
- При расчёте автоматически конвертируется в метры: `consumption_cm / 100`

### Номера документов
- Производство: `ПРВ-YYYYMMDD-NNNN`
- Например: `ПРВ-20250122-0001`

### Типы материалов
- `Ткань` - из цеха ткачества
- `Ламинат` - из цеха ламинации
- `Ткань/Ламинат` - детали, которые можно кроить из обоих
- `Стропа` - из цеха строп

## Troubleshooting

### Ошибка "Table does not exist"
→ Миграция не была применена. Примените SQL из файла миграции через Supabase Dashboard

### Нет доступных материалов в выпадающем списке
→ Проверьте наличие данных в таблицах балансов материалов

### Ошибка при списании материала
→ Убедитесь, что существуют таблицы складов (weaving_warehouse, lamination_warehouse, straps_warehouse)

## Дальнейшее развитие

Возможные улучшения:
- Добавить печать документов
- Реализовать отмену операций
- Добавить аналитику и отчёты по кроям
- Интеграция с модулем пошива для автоматического расхода деталей
