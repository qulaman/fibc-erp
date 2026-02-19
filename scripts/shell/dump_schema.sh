#!/bin/bash
# Получение полной схемы базы данных

echo "Dumping database schema..."
cd c:/Users/Turing/fibc-erp

# Полная схема со всеми объектами
npx supabase db dump --schema public > supabase/current_schema.sql

echo "✅ Schema saved to: supabase/current_schema.sql"
echo ""
echo "File size:"
ls -lh supabase/current_schema.sql

# Также создадим краткую версию - только структура таблиц
echo ""
echo "Creating table-only schema..."
npx supabase db dump --schema public --data-only=false | grep -A 50 "CREATE TABLE" > supabase/tables_schema.sql

echo "✅ Tables schema saved to: supabase/tables_schema.sql"
