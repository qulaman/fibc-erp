# Руководство по стилям FIBC ERP

## Общие CSS классы

Все общие стили находятся в `app/globals.css` в слое `@layer components`.

### Контейнеры страниц

```tsx
// Основной контейнер страницы
<div className="page-container">
  // Эквивалент: p-4 md:p-8 bg-black min-h-screen text-white font-sans
</div>

// Шапка страницы
<div className="page-header">
  // Эквивалент: flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-zinc-800 pb-6
</div>
```

### Заголовки

```tsx
// H1 с иконкой
<h1 className="h1-bold">
  <span className="bg-blue-600 p-2 rounded-lg">
    <Icon size={24} />
  </span>
  Заголовок страницы
</h1>

// Описание под заголовком
<p className="page-description">Описание страницы</p>
```

### Статистика в шапке

```tsx
<div className="stats-container">
  <div className="stat-card">
    <div className="stat-label">Всего записей</div>
    <div className="stat-value text-blue-400">{count}</div>
  </div>
</div>
```

### Поиск

```tsx
<div className="search-container">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
  <Input placeholder="Поиск..." className="pl-10" />
</div>
```

### Сетки и таблицы

```tsx
// Сетка карточек
<div className="grid-cards">
  {items.map(item => <Card key={item.id}>...</Card>)}
</div>

// Контейнер таблицы
<div className="table-container">
  <Table>...</Table>
</div>

// Пустое состояние
<div className="empty-state">
  Нет данных
</div>
```

### Формы

```tsx
// Секция формы
<div className="form-section">
  <Label className="section-title">
    <Icon size={14} /> Заголовок секции
  </Label>
  {/* Поля формы */}
</div>

// Кнопка действия
<Button className="action-button bg-blue-600 hover:bg-blue-700">
  <Save className="mr-2" /> Сохранить
</Button>
```

### Вспомогательные классы

```tsx
// Иконка с текстом
<div className="icon-text">
  <Calendar size={14} />
  {date}
</div>

// Разделитель
<div className="divider"></div>
```

## Цветовая схема по модулям

- **Экструзия**: `bg-[#E60012]` (красный бренд), `text-red-400/500`
- **Ткачество**: `bg-amber-600`, `text-amber-400/500`
- **Ламинация**: `bg-orange-600`, `text-orange-400/500`
- **Стропы**: `bg-blue-600`, `text-blue-400/500`
- **Склад нити**: `bg-indigo-600`, `text-indigo-400/500`
- **Склад ткани**: `bg-purple-600`, `text-purple-400/500`
- **Склад сырья**: `bg-green-600`, `text-green-400/500`

## Структура страницы

Типичная структура страницы склада/журнала:

```tsx
export default function Page() {
  return (
    <div className="page-container">
      {/* ШАПКА */}
      <div className="page-header">
        <div>
          <h1 className="h1-bold">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Icon size={24} className="text-white" />
            </div>
            Заголовок
          </h1>
          <p className="page-description">Описание</p>
        </div>

        <div className="stats-container">
          <div className="stat-card">
            <div className="stat-label">Метрика</div>
            <div className="stat-value text-blue-400">{value}</div>
          </div>
        </div>
      </div>

      {/* ПОИСК (опционально) */}
      <div className="search-container">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 h-4 w-4" />
        <Input placeholder="Поиск..." />
      </div>

      {/* КОНТЕНТ */}
      {loading ? (
        <div className="text-center text-zinc-500 py-10">Загрузка...</div>
      ) : (
        <div className="grid-cards">
          {/* Карточки */}
        </div>
      )}
    </div>
  );
}
```

## Примеры использования

### Страница склада

```tsx
<div className="page-container">
  <div className="page-header">
    <div>
      <h1 className="h1-bold">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Warehouse size={24} className="text-white" />
        </div>
        Склад Строп
      </h1>
      <p className="page-description">Готовые рулоны строп на складе</p>
    </div>
    <div className="stats-container">
      <div className="stat-card">
        <div className="stat-label">Всего рулонов</div>
        <div className="stat-value text-blue-400">{rolls.length}</div>
      </div>
    </div>
  </div>
</div>
```

### Страница журнала производства

```tsx
<div className="page-container">
  <div className="page-header">
    <div>
      <h1 className="h1-bold">
        <div className="bg-orange-600 p-2 rounded-lg">
          <Layers size={24} className="text-white" />
        </div>
        Журнал Ламинации
      </h1>
      <p className="page-description">История производства</p>
    </div>
    <div className="stats-container">
      <div className="stat-card">
        <div className="stat-label">Всего записей</div>
        <div className="stat-value text-orange-400">{records.length}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Общая длина</div>
        <div className="stat-value text-orange-400">{totalLength} м</div>
      </div>
    </div>
  </div>
</div>
```

## Правила разработки

1. **Всегда используйте готовые CSS классы** из `globals.css` вместо дублирования Tailwind классов
2. **Соблюдайте цветовую схему** модулей для консистентности
3. **Используйте структуру page-container → page-header → content** для всех страниц
4. **Добавляйте новые общие классы** в `globals.css` если паттерн повторяется 3+ раз
5. **Не используйте inline styles** - только Tailwind классы или готовые компоненты
