#!/usr/bin/env node
/**
 * Получение схемы базы данных через Supabase JS client
 * Использует SERVICE_ROLE_KEY для полного доступа к информации о схеме
 */

const fs = require('fs');
const path = require('path');

// Загрузка переменных окружения из .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

async function getSchema() {
    const { createClient } = await import('@supabase/supabase-js');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        console.error('❌ Missing Supabase credentials in .env.local');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log('📊 Fetching database schema...\n');

    let schema = '-- DATABASE SCHEMA DUMP\n';
    schema += `-- Generated: ${new Date().toISOString()}\n`;
    schema += `-- Project: ${supabaseUrl}\n\n`;

    // 1. Получить все таблицы
    const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
        query: `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `
    }).catch(() => {
        // Если RPC не доступна, используем прямой запрос
        return supabase.from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
            .eq('table_type', 'BASE TABLE');
    });

    if (!tables || tablesError) {
        console.log('⚠️  RPC method not available, using alternative approach...\n');

        // Альтернативный подход - запросить структуру известных таблиц
        const knownTables = [
            'production_extrusion',
            'employees',
            'equipment',
            'yarn_warehouse',
            'raw_materials',
            'production_weaving',
            'production_lamination',
            'production_cutting',
            'production_sewing',
            'tkan_specifications'
        ];

        schema += '-- KNOWN TABLES (partial list):\n';
        schema += knownTables.map(t => `-- ${t}`).join('\n');
        schema += '\n\n';

        // Для каждой известной таблицы получить структуру через метаданные
        for (const tableName of knownTables) {
            try {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(0);

                if (!error) {
                    schema += `-- TABLE: ${tableName} (exists)\n`;
                }
            } catch (e) {
                // Таблица не существует или нет доступа
            }
        }
    } else {
        schema += '-- TABLES:\n';
        tables.forEach(t => {
            schema += `-- ${t.table_name}\n`;
        });
    }

    schema += '\n\n';
    schema += '-- To get full schema, please run get_full_schema.sql in Supabase SQL Editor\n';

    // Сохранить в файл
    const outputPath = path.join(__dirname, '..', 'supabase', 'current_schema.sql');
    fs.writeFileSync(outputPath, schema, 'utf8');

    console.log('✅ Schema saved to:', outputPath);
    console.log('\n📝 For complete schema, run this SQL in Supabase Dashboard:\n');
    console.log('   SELECT table_name, column_name, data_type');
    console.log('   FROM information_schema.columns');
    console.log('   WHERE table_schema = \'public\'');
    console.log('   ORDER BY table_name, ordinal_position;\n');
}

getSchema().catch(console.error);
